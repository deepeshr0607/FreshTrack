import React, { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
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

export default function OcrCheck() {
  const { state } = useAuth();
  if (!__DEV__ || !state.user || state.demo) return <PrototypeScreen back={() => router.back()}><Text style={ui.text}>This development check requires a real signed-in account.</Text></PrototypeScreen>;
  return <Probe key={state.user.id} subject={state.user.id} />;
}
function Probe({ subject }: { subject: string }) {
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
    return () => { focused.current = false; store.clear(); importer.leave(); };
  }, [store, importer]));
  useEffect(() => {
    if (!auth.checking && focused.current && !importer.getSnapshot().ready) void importer.restore();
  }, [auth.checking, importer]);
  const supported = ocrProbeSupported();
  return <PrototypeScreen back={() => router.back()}>
    <Text style={ui.title}>Receipt OCR Check</Text>
    <ReceiptImportView controller={importer} state={imported} readOnly={real.readOnly} onNewReceipt={() => { store.clear(); importer.reset(); }} />
    <View style={{ display: imported.ready && imported.stage === 'idle' ? 'flex' : 'none', gap: 16 }}>
    <View style={ui.card}><Text style={ui.heading}>Read a receipt on this phone</Text>
      <Text style={ui.text}>Development proof of concept. Apple Vision on iPhone; ML Kit on Android. Photos and raw OCR text stay on this device. Only reviewed grocery fields are sent after explicit import confirmation.</Text>
      <Text style={ui.text}>Leaving this screen clears the result and attempts to delete temporary image copies. Text recognition can be wrong. Review detected groceries below; continue to duplicate review and confirm before saving to Pantry.</Text>
    </View>
    {!supported && <Text accessibilityRole="alert" style={ui.text}>OCR is unavailable in this build. Use the updated FreshTrack Dev app, not Expo Go.</Text>}
    <PrimaryButton label="Photograph Receipt" disabled={!supported || state.busy} onPress={() => void store.choose('camera')} />
    <PrimaryButton label="Choose Receipt Photo" variant="ghost" disabled={!supported || state.busy} onPress={() => void store.choose('library')} />
    {state.image && <View style={ui.card}><Image source={{ uri: state.image }} accessibilityLabel="Selected receipt preview" resizeMode="contain" style={{ height: 300, width: '100%', backgroundColor: '#283044', borderRadius: 16 }} />
      <PrimaryButton label="Read Text on Device" loading={state.busy} disabled={state.busy} onPress={() => void store.read()} />
    </View>}
    {state.busy && <Text accessibilityRole="progressbar" style={ui.text}>Preparing or reading your photo…</Text>}
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.text}>{state.error}</Text>
      <PrimaryButton label="Open Device Settings" variant="ghost" onPress={() => void Linking.openSettings().catch(() => {})} /></View>}
    {state.read && <View style={ui.card}><Text style={ui.heading}>{state.lines.length ? `${state.lines.length} text lines detected` : 'No text detected'}</Text>
      <Text style={ui.text}>{state.lines.length ? 'Raw OCR text — not verified groceries or confidence scores.' : 'Use a well-lit, upright receipt and retry or choose another photo.'}</Text>
      <Text selectable style={ui.text}>{state.lines.join('\n')}</Text>
    </View>}
    {state.read && state.lines.length > 0 && <LocalReceiptReview lines={state.lines} onPrepare={input => void importer.review(input)} />}
    <PrimaryButton label="Clear Photo & Text" variant="ghost" disabled={state.busy || !state.image} onPress={() => store.clear()} />
    <PrimaryButton label="Enter Grocery Manually" variant="ghost" disabled={state.busy} onPress={() => router.push('/pantry/add')} />
    </View>
  </PrototypeScreen>;
}
