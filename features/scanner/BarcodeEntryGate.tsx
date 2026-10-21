import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useRealPantry } from '@/context/RealPantryContext';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { nativeBarcodeRetry } from './nativeBarcodeRetry';
import { packageBarcode } from '@/lib/packageBarcode';
import type { BarcodeIntent } from '@/lib/barcodeEntry';
import type { BarcodeLookup } from '@/types/api';
import { NeonAuthError } from '@/lib/neonAuth';
export interface BarcodeEntryProps { subject: string; code: string; catalog: BarcodeLookup | null; pending: BarcodeIntent | null;
  storage: ReturnType<typeof nativeBarcodeRetry> }

export default function BarcodeEntryGate({ code, render }: { code?: string; render: (entry: BarcodeEntryProps) => React.ReactNode }) {
  const { state, session } = useAuth();
  const real = useRealPantry(), live = useRef(real); live.current = real;
  const subject = state.user?.id;
  const [result, setResult] = useState<BarcodeLookup | null>(null);
  const [entry, setEntry] = useState<BarcodeEntryProps | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const invalidateRequests = useCallback(() => { generation.current++; }, []);
  const lookup = useCallback(async () => {
    if (!subject || state.demo || session.getSnapshot().checking) return;
    const version = ++generation.current;
    const active = () => version === generation.current && session.getSnapshot().user?.id === subject && !session.getSnapshot().checking;
    setBusy(true); setError(''); setResult(null);
    try {
      const storage = nativeBarcodeRetry(subject), pending = await storage.load();
      if (!active()) return;
      if (pending) { setEntry({ subject, code: pending.input.barcode!, pending, catalog: null, storage }); return; }
      if (!code) { setError('No saved barcode purchase to retry. Return to Scanner to scan an item.'); return; }
      if (!packageBarcode(code)) { setError('This barcode is invalid. Return to Scanner or enter an item manually.'); return; }
      const row = await live.current.lookupBarcode(code);
      if (active()) setResult(row);
    } catch (error) { if (active()) setError(error instanceof NeonAuthError ? error.message : 'Saved barcode retry could not be checked. Retry before entering another purchase.'); }
    finally { if (version === generation.current) setBusy(false); }
  }, [subject, code, state.demo, session]);
  useEffect(() => { setEntry(null); void lookup(); return invalidateRequests; }, [lookup, invalidateRequests]);
  if (entry && entry.subject === subject && !state.demo) return render(entry);
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/scanner')}>
    <Text style={ui.title}>Review Barcode Product</Text>
    <Text style={ui.text}>No grocery is saved until you review its details and tap Add to Pantry.</Text>
    {busy ? <Text accessibilityLiveRegion="polite" style={ui.text}>Checking saved purchase and product catalog…</Text> : <>
      {result && <View style={ui.card}>
        <Text selectable style={ui.label}>{result.barcode}</Text>
        <Text style={ui.heading}>{result.status === 'FOUND' ? result.product!.name : result.status === 'INCOMPLETE' ? 'Product details incomplete' : 'Product not found'}</Text>
        {result.product && <><Text style={ui.text}>Brand: {result.product.brand ?? 'Unknown'}</Text>
          <Text style={ui.text}>Package size: {result.product.packageSize ?? 'Unknown'}</Text>
          <Text style={ui.text}>Catalog category: {result.product.categoryLabel ?? 'Unknown'} · Choose your Pantry category below.</Text></>}
        <Text style={ui.text}>Open Food Facts · ODbL · Community data, unverified. {result.source.environment === 'staging' ? 'Development catalog; coverage may differ from the public catalog.' : ''}</Text>
        <Text style={ui.text}>Check the package. Quantity purchased, purchase value and expiry are not supplied by the barcode.</Text>
        <PrimaryButton label="View Catalog Source" variant="ghost" onPress={() => { void Linking.openURL(result.source.url).catch(() => setError('Unable to open the source link.')); }} />
        <PrimaryButton label={result.status === 'FOUND' ? 'Review These Details' : 'Enter Details for This Barcode'} onPress={() => {
          if (subject && code) setEntry({ subject, code, catalog: result, pending: null, storage: nativeBarcodeRetry(subject) });
        }} />
      </View>}
      {!!error && <Text accessibilityRole="alert" style={ui.text}>{error}</Text>}
      <PrimaryButton label="Retry Product Lookup" variant="ghost" onPress={() => { void lookup(); }} />
      <PrimaryButton label="Enter Item Manually" variant="secondary" onPress={() => router.replace('/pantry/add')} />
      <PrimaryButton label="Return to Scanner" variant="ghost" onPress={() => router.dismissTo('/(tabs)/scanner')} />
    </>}
  </PrototypeScreen>;
}
