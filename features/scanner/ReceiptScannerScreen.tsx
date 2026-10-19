import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import LocalReceiptReview from '@/features/scanner/LocalReceiptReview';
import ReceiptImportView from '@/features/scanner/ReceiptImportView';
import { createReceiptImportController } from '@/lib/receiptImport';
import { nativeReceiptImportStorage } from '@/features/scanner/nativeReceiptImport';
import { useRealPantry } from '@/context/RealPantryContext';
import { useAuth } from '@/context/AuthContext';
import { createReceiptOcrProbe } from '@/lib/receiptOcrProbe';
import { chooseOcrImage, disposeOcrImage, ocrProbeSupported, recognizeOcrImage } from '@/features/scanner/ocrProbeDevice';

/** Shared real receipt workflow. Diagnostics do not change the request/storage contract. */
export default function ReceiptScannerScreen({ diagnostics = false }: { diagnostics?: boolean }) {
  const { state } = useAuth();
  if (!state.user || state.demo) return <PrototypeScreen back={() => router.dismissTo('/(tabs)/scanner')}>
    <Text style={ui.title}>Scan Receipt</Text><Text style={ui.text}>Sign in to scan receipts into your household. The Demo Scanner offers a sample receipt preview.</Text>
  </PrototypeScreen>;
  return <ReceiptSession key={state.user.id} subject={state.user.id} diagnostics={DIAGNOSTICS_ENABLED && diagnostics} />;
}
function ReceiptSession({ subject, diagnostics }: { subject: string; diagnostics: boolean }) {
  const [showText, setShowText] = useState(false);
  const { session, state: auth } = useAuth();
  const real = useRealPantry(); const realRef = useRef(real); realRef.current = real;
  const focused = useRef(false);
  const importer = useMemo(() => createReceiptImportController({
    storage: nativeReceiptImportStorage(subject),
    active: () => { const current = session.getSnapshot(); return focused.current && !current.checking && current.status === 'authenticated' && current.user?.id === subject && !current.demo; },
    review: input => realRef.current.reviewReceipt(input),
    send: (input, key) => realRef.current.importReceipt(input, key),
  }), [session, subject]);
  const imported = useSyncExternalStore(importer.subscribe, importer.getSnapshot, importer.getSnapshot);
  const store = useMemo(() => createReceiptOcrProbe({ choose: chooseOcrImage, recognize: recognizeOcrImage, dispose: disposeOcrImage }, () => {
    const current = session.getSnapshot();
    return current.status === 'authenticated' && current.user?.id === subject && !current.demo;
  }), [session, subject]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useFocusEffect(useCallback(() => {
    focused.current = true; void importer.restore();
    return () => { focused.current = false; store.clear(); setShowText(false); importer.leave(); };
  }, [store, importer]));
  useEffect(() => {
    if (!auth.checking && focused.current && !importer.getSnapshot().ready) void importer.restore();
  }, [auth.checking, importer]);
  const supported = ocrProbeSupported();
  return <PrototypeScreen back={() => router.back()}>
    <Text accessibilityRole="header" style={ui.title}>{diagnostics ? 'Receipt OCR Check' : 'Scan Receipt'}</Text>
    <ReceiptImportView diagnostics={diagnostics} controller={importer} state={imported} readOnly={real.readOnly} onNewReceipt={() => { store.clear(); setShowText(false); importer.reset(); }} />
    <View style={{ display: imported.ready && imported.stage === 'idle' ? 'flex' : 'none', gap: 16 }}>
    <View style={ui.card}><Text style={ui.heading}>{diagnostics ? 'Read a receipt on this phone' : 'Bring your groceries into view'}</Text>
      <Text style={ui.text}>{diagnostics ? 'Development check. Apple Vision on iPhone; ML Kit on Android. ' : 'Photograph a well-lit receipt or choose a photo, then review the detected groceries. '}Photos and recognized text stay on this device. Only reviewed grocery fields are sent after you confirm.</Text>
      <Text style={ui.text}>{diagnostics ? 'Leaving this screen clears the result and attempts to delete temporary image copies. Review detected groceries before confirming import.' : 'Text recognition can make mistakes. Check names, quantities, values and dates before adding anything. Leaving this screen discards unconfirmed edits.'}</Text>
    </View>
    {!supported && <Text accessibilityRole="alert" style={ui.text}>{diagnostics ? 'OCR is unavailable in this build. Use the updated FreshTrack Dev app, not Expo Go.' : 'Receipt text recognition is unavailable in this app build. You can enter groceries manually.'}</Text>}
    <PrimaryButton label="Photograph Receipt" disabled={!supported || state.busy} onPress={() => { setShowText(false); void store.choose('camera'); }} />
    <PrimaryButton label="Choose Receipt Photo" variant="ghost" disabled={!supported || state.busy} onPress={() => { setShowText(false); void store.choose('library'); }} />
    {state.image && <View style={ui.card}><Image source={{ uri: state.image }} accessibilityLabel="Selected receipt preview" resizeMode="contain" style={{ height: 300, width: '100%', backgroundColor: '#283044', borderRadius: 16 }} />
      <PrimaryButton label="Read Text on Device" loading={state.busy} disabled={state.busy} onPress={() => { setShowText(false); void store.read(); }} />
    </View>}
    {state.busy && <Text accessibilityRole="progressbar" style={ui.text}>Preparing or reading your photo…</Text>}
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.text}>{state.error}</Text>
      {state.errorCode === 'PERMISSION' && <PrimaryButton label="Open Device Settings" variant="ghost" onPress={() => void Linking.openSettings().catch(() => {})} />}</View>}
    {state.read && <View style={ui.card}><Text style={ui.heading}>{state.lines.length ? `${state.lines.length} text lines detected` : 'No text detected'}</Text>
      <Text style={ui.text}>{state.lines.length ? 'Review the grocery candidates below. Recognition can contain mistakes.' : 'Use a well-lit, upright receipt and retry or choose another photo.'}</Text>
      {diagnostics && <Text style={ui.text}>{state.layout ? 'Position-aware OCR available' : 'Text-only OCR · manual matching available'}</Text>}
      {!!state.lines.length && !diagnostics && <PrimaryButton label={showText ? 'Hide Recognized Text' : 'Show Recognized Text'} variant="ghost" onPress={() => setShowText(value => !value)} />}
      {(diagnostics || showText) && <Text selectable style={ui.text}>{state.lines.join('\n')}</Text>}
    </View>}
    {state.read && state.lines.length > 0 && <LocalReceiptReview lines={state.lines} layout={state.layout} onPrepare={input => void importer.review(input)} />}
    <PrimaryButton label="Clear Photo & Text" variant="ghost" disabled={state.busy || !state.image} onPress={() => { store.clear(); setShowText(false); }} />
    <PrimaryButton label="Enter Grocery Manually" variant="ghost" disabled={state.busy} onPress={() => router.push('/pantry/add')} />
    </View>
  </PrototypeScreen>;
}
