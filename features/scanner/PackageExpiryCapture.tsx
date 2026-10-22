import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import PrimaryButton from '@/components/PrimaryButton';
import CalendarDateField from '@/components/CalendarDateField';
import { ui } from '@/components/PrototypeScreen';
import { createReceiptOcrProbe } from '@/lib/receiptOcrProbe';
import { packageExpiryDates } from '@/lib/receiptProducts';
import { confirmPrintedReceiptDate } from '@/lib/receiptPackageDates';
import { chooseOcrImage, disposeOcrImage, recognizeOcrImage } from './ocrProbeDevice';

export default function PackageExpiryCapture({ name, onConfirm, onCancel }: {
  name: string; onConfirm(date: string): void; onCancel(): void;
}) {
  const { session, state: auth } = useAuth();
  const subject = auth.user?.id;
  const store = useMemo(() => createReceiptOcrProbe({ choose: chooseOcrImage, recognize: recognizeOcrImage, dispose: disposeOcrImage },
    () => { const current = session.getSnapshot(); return current.status === 'authenticated' && current.user?.id === subject && !current.demo; }), [session, subject]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [date, setDate] = useState(''), [error, setError] = useState('');
  useEffect(() => { void store.choose('camera', true); return () => store.clear(); }, [store]);
  const dates = state.read ? packageExpiryDates(state.lines) : [];
  return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Scan expiry · {name}</Text>
    <Text style={ui.text}>Photograph only the printed EXP, use-by or best-before section. Keep the stamp sharp and well lit.</Text>
    {state.image && <Image source={{ uri: state.image }} accessibilityLabel={`Expiry label for ${name}`} resizeMode="contain" style={{ width: '100%', height: 180, borderRadius: 16 }} />}
    {state.busy && <Text accessibilityRole="progressbar" style={ui.text}>Reading the expiry label…</Text>}
    {!!state.error && <Text accessibilityRole="alert" style={ui.text}>{state.error}</Text>}
    {state.errorCode === 'PERMISSION' && <PrimaryButton label="Open Device Settings" variant="ghost" onPress={() => void Linking.openSettings().catch(() => {})} />}
    <PrimaryButton label="Retake Expiry Photo" variant="ghost" disabled={state.busy} onPress={() => void store.choose('camera', true)} />
    <PrimaryButton label="Upload Expiry Photo" variant="ghost" disabled={state.busy} onPress={() => void store.choose('library', true)} />
    {state.read && <>
      <Text style={ui.text}>{dates.length ? 'Choose the printed expiry below, then confirm it against your package.' : 'No full expiry date recognized. Retake a closer photo or choose the printed date below.'}</Text>
      {dates.map(value => <PrimaryButton key={value} label={`Use ${value}`} variant={date === value ? 'primary' : 'ghost'} onPress={() => { setDate(value); setError(''); }} />)}
    </>}
    <Text style={ui.text}>Numeric labels are read as day/month/year. Manufacture dates and “best before X months” need manual checking. Correct the result before confirming.</Text>
    <CalendarDateField label="Expiry date" value={date} onChange={value => { setDate(value); setError(''); }} disabled={state.busy} />
    {!!error && <Text accessibilityRole="alert" style={ui.text}>{error}</Text>}
    <PrimaryButton label="Confirm Printed Expiry" disabled={state.busy} onPress={() => {
      try { confirmPrintedReceiptDate(name, date); onConfirm(date); }
      catch (problem) { setError((problem as Error).message); }
    }} />
    <PrimaryButton label="Cancel — Keep Product Unchanged" variant="ghost" disabled={state.busy} onPress={onCancel} />
  </View>;
}
