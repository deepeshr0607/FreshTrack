import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import ExpiryBadge from '@/components/ExpiryBadge';
import { ui } from '@/components/PrototypeScreen';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { MOCK_CURRENCY } from '@/lib/mock';
import { useMockPantry } from '@/context/MockPantryContext';
import { expiryDays, validatePantryDraft } from '@/lib/pantry';
import { barcodeDuplicates, barcodeLookup, dateAfter, MOCK_BARCODE_PRODUCTS, newBarcodeCandidate,
  prepareBarcodeImport, type BarcodeCandidate } from '@/lib/barcode';

type Stage = 'lookup' | 'loading' | 'missing' | 'error' | 'verify' | 'review' | 'confirm' | 'saved';
/** Mock catalog and package-date review only; never opens a camera or makes a network request. */
export default function BarcodeReview() {
  const { items, addBarcodeQueue } = useMockPantry();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [stage, setStage] = useState<Stage>('lookup');
  const [code, setCode] = useState(MOCK_BARCODE_PRODUCTS[0]!.barcode);
  const [queue, setQueue] = useState<BarcodeCandidate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const submitted = useRef(false);
  const current = queue.find((row) => row.id === activeId);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const scan = (retry = false) => {
    if (!/^\d{8,14}$/.test(code.trim())) { setError('Enter 8–14 barcode digits or choose a sample product.'); return; }
    setError(null); setStage('loading');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!retry && preview === 'barcode-error') { setStage('error'); return; }
      const product = !retry && preview === 'barcode-missing' ? null : barcodeLookup(code);
      if (!product) { setStage('missing'); return; }
      const row = newBarcodeCandidate(product, `queue-${++nextId.current}`);
      setQueue((previous) => [...previous, row]); setActiveId(row.id); setStage('verify');
    }, 800);
  };
  const update = (id: string, change: Partial<BarcodeCandidate>) => {
    setQueue((previous) => previous.map((row) => row.id === id ? { ...row, ...change } : row)); setError(null);
  };
  const setDate = (date: string, source: BarcodeCandidate['expirySource']) => {
    if (current) update(current.id, { draft: { ...current.draft, expiresOn: date }, expirySource: source, confirmed: false });
  };
  const review = () => { setStage('review'); setError(null); };
  const readyCount = queue.filter((row) => row.confirmed).length;
  const plan = prepareBarcodeImport(queue, items, 'preview');
  const remove = (id: string) => {
    const remaining = queue.filter((row) => row.id !== id).map((row) => ({ ...row, duplicateChoice: undefined }));
    setQueue(remaining); setError(null);
    if (id === activeId) setActiveId(remaining[0]?.id ?? null);
    if (!remaining.length) setStage('lookup');
  };

  if (stage === 'saved') return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>✓ Packaged items added</Text>
    <Text style={ui.text}>{savedIds.length} separate purchases added to shared Pantry. Reloading resets this demo.</Text>
    <PrimaryButton label="View Pantry" onPress={() => router.push({ pathname: '/(tabs)/pantry', params: { added: savedIds[0] } })} />
    <PrimaryButton label="Start New Barcode Queue" variant="ghost" onPress={() => {
      setQueue([]); setActiveId(null); setStage('lookup'); setError(null); submitted.current = false;
    }} />
  </View>;

  if (stage === 'review' || stage === 'confirm') return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>{stage === 'review' ? 'Review Packaged Queue' : 'Confirm Packaged Items'}</Text>
    <Text style={ui.text}>{queue.length} queued · {readyCount} expiry options confirmed. Nothing is added until final confirmation.</Text>
    {queue.map((row, index) => <View key={row.id} style={styles.item}>
      <Text style={ui.heading}>{row.product.emoji} {row.draft.name}</Text>
      <Text style={ui.text}>{row.draft.quantity} {row.draft.unit} · ${Number(row.draft.price.replace(',', '.') || 0).toFixed(2)} · {row.draft.expiresOn || 'Date needed'}</Text>
      <Text style={ui.text}>{row.expirySource === 'PACKAGE_DATE' ? 'Confirmed simulated package stamp' : row.expirySource === 'PRESET_ESTIMATE' ? 'Estimated expiry' : 'User-entered expiry'} · {row.confirmed ? 'Reviewed' : 'Needs confirmation'}{row.duplicateChoice === 'skip' ? ' · Skipped' : ''}</Text>
      {stage === 'review' && <>
        <View style={styles.choices}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit queued ${row.draft.name}`} style={ui.pill}
            onPress={() => { setActiveId(row.id); setStage('verify'); setError(null); }}><Text style={ui.label}>Edit / Verify</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove queued ${row.draft.name}`} style={ui.pill} onPress={() => remove(row.id)}><Text style={ui.label}>Remove</Text></Pressable>
        </View>
        {barcodeDuplicates(row, items, queue.slice(0, index)).length > 0 && <>
          <Text style={ui.text}>Possible duplicate in Pantry or this queue. Skip or add a separate purchase; existing groceries stay unchanged.</Text>
          <View style={styles.choices}>{(['skip', 'separate'] as const).map((choice) => <Pressable key={choice} accessibilityRole="radio"
            accessibilityLabel={`${choice === 'skip' ? 'Skip' : 'Add separately'} queued ${row.draft.name}`}
            accessibilityState={{ checked: row.duplicateChoice === choice }} style={[ui.pill, row.duplicateChoice === choice && styles.selected]}
            onPress={() => update(row.id, { duplicateChoice: choice })}><Text style={ui.label}>{choice === 'skip' ? 'Skip' : 'Add separately'}</Text></Pressable>)}</View>
        </>}
      </>}
    </View>)}
    {stage === 'confirm' && <Text style={ui.heading}>{plan.items?.length ?? 0} purchases · ${plan.items?.reduce((sum, row) => sum + row.price, 0).toFixed(2) ?? '0.00'} to add (skipped rows excluded)</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label={stage === 'review' ? 'Review Items to Add' : 'Confirm Add Packaged Items'} disabled={!queue.length} onPress={() => {
      if (stage === 'review') {
        if (plan.error) { setError(plan.error); return; }
        setStage('confirm'); setError(null); return;
      }
      if (submitted.current) return;
      const result = addBarcodeQueue(queue);
      if (result.error) { setError(result.error); setStage('review'); return; }
      submitted.current = true; setSavedIds(result.ids); setStage('saved');
    }} />
    <PrimaryButton label={stage === 'confirm' ? 'Back to Queue Review' : 'Scan Another Barcode'} variant="ghost"
      onPress={() => { setStage(stage === 'confirm' ? 'review' : 'lookup'); setError(null); }} />
  </View>;

  return <View style={{ gap: Spacing.base }}>
    {queue.length > 0 && <View style={styles.banner}><Text style={ui.heading}>{queue.length} packaged items queued · {readyCount} reviewed</Text>
      <Text style={ui.text}>Queue survives navigation between scan and verification. Changing Scanner mode discards this pending queue.</Text></View>}
    <Text accessibilityRole="header" style={ui.title}>{stage === 'verify' ? 'Verify Packaged Shelf-Life' : 'Barcode Lookup'}</Text>
    {stage === 'verify' && <View accessibilityLabel={`${readyCount} of ${queue.length} items reviewed`} style={styles.progress}>
      {queue.map((row) => <View key={row.id} style={[styles.segment,
        (row.confirmed || row.id === activeId) && { backgroundColor: Colors.primary }]} />)}
    </View>}
    <View style={styles.viewfinder}>
      <MaterialCommunityIcons name={stage === 'verify' ? 'calendar-search' : 'barcode-scan'} size={48} color={Colors.white} />
      <Text style={styles.cameraText}>{stage === 'loading' ? 'Looking up sample barcode…' : 'Camera not connected · simulated scan'}</Text>
      {stage === 'verify' && current && <>
        <Text style={styles.cameraText}>Target: {current.product.target}</Text>
        {current.expirySource === 'PACKAGE_DATE' && !!current.draft.expiresOn && <Text style={styles.stamp}>Sample BB: {current.draft.expiresOn}</Text>}
      </>}
    </View>
    {stage !== 'verify' && <>
      <FormInput label="Barcode digits" accessibilityLabel="Barcode digits" editable={stage !== 'loading'} value={code} onChangeText={(v) => { setCode(v); setError(null); }} keyboardType="number-pad" maxLength={14} />
      <Text style={ui.text}>Choose a sample product or enter a barcode. Only these synthetic sample codes are recognized.</Text>
      <View style={styles.choices}>{MOCK_BARCODE_PRODUCTS.map((product) => <Pressable key={product.barcode} accessibilityRole="radio"
        accessibilityLabel={`Sample ${product.name}`} accessibilityState={{ checked: code === product.barcode }} style={[ui.pill, code === product.barcode && styles.selected]}
        disabled={stage === 'loading'} onPress={() => { setCode(product.barcode); setStage('lookup'); setError(null); }}><Text style={ui.label}>{product.emoji} {product.name}</Text></Pressable>)}</View>
      {(stage === 'missing' || stage === 'error') && <View style={styles.item}>
        <Text accessibilityRole="header" style={ui.heading}>{stage === 'missing' ? 'Product not found' : 'Lookup unavailable'}</Text>
        <Text style={ui.text}>Your pending queue is unchanged. Try a sample code or enter the grocery manually.</Text>
        <PrimaryButton label="Enter Item Manually" variant="ghost" onPress={() => router.push('/pantry/add')} />
      </View>}
      <PrimaryButton label={stage === 'error' || stage === 'missing' ? 'Retry Barcode Lookup' : 'Simulate Barcode Scan'} loading={stage === 'loading'} onPress={() => scan(stage === 'error' || stage === 'missing')} />
    </>}
    {stage === 'verify' && current && <View style={ui.card}>
      <Text style={ui.label}>ITEM {queue.findIndex((row) => row.id === current.id) + 1} OF {queue.length} · {current.product.category}</Text>
      <Text style={ui.heading}>{current.product.emoji} {current.draft.name}</Text>
      <Text style={ui.text}>Barcode {current.product.barcode} · Target: {current.product.target}</Text>
      <View style={styles.choices}>
        <Pressable accessibilityRole="button" style={ui.pill} onPress={() => setDate(dateAfter(current.product.sampleStampDays), 'PACKAGE_DATE')}><Text style={ui.label}>Simulate Date Stamp</Text></Pressable>
        <Pressable accessibilityRole="button" style={ui.pill} onPress={() => setDate(dateAfter(current.product.estimateDays), 'PRESET_ESTIMATE')}><Text style={ui.label}>Use Estimate</Text></Pressable>
      </View>
      <FormInput label="Expiry date (YYYY-MM-DD)" accessibilityLabel="Packaged expiry date" value={current.draft.expiresOn} maxLength={10}
        placeholder="YYYY-MM-DD" onChangeText={(value) => setDate(value, 'USER_ENTERED')} />
      {!!current.draft.expiresOn && !validatePantryDraft(current.draft) && <ExpiryBadge daysLeft={expiryDays(current.draft.expiresOn)} expirySource={current.expirySource} />}
      <Text style={ui.text}>{current.expirySource === 'PACKAGE_DATE' ? 'Sample printed date detected — confirm below. No real package was scanned.' :
        current.expirySource === 'PRESET_ESTIMATE' ? 'Suggested shelf life, not a verified package date.' : 'Manual date: recorded as user entered.'}</Text>
      <FormInput label="Quantity" accessibilityLabel="Packaged quantity" value={current.draft.quantity} keyboardType="decimal-pad"
        onChangeText={(value) => update(current.id, { draft: { ...current.draft, quantity: value }, confirmed: false })} />
      <FormInput label={`Whole-entry value (${MOCK_CURRENCY.symbol}, optional)`} accessibilityLabel="Packaged purchase value" value={current.draft.price} keyboardType="decimal-pad"
        onChangeText={(value) => update(current.id, { draft: { ...current.draft, price: value }, confirmed: false })} />
      <Text style={ui.text}>Unknown values count as $0. Past dates are allowed for reconciliation.</Text>
      <PrimaryButton label="Confirm Date & Next" onPress={() => {
        const issue = validatePantryDraft(current.draft);
        if (issue) { setError(issue); return; }
        update(current.id, { confirmed: true });
        const next = queue.find((row) => row.id !== current.id && !row.confirmed);
        if (next) setActiveId(next.id); else review();
      }} />
      <PrimaryButton label="Scan Another Barcode" variant="ghost" onPress={() => { setStage('lookup'); setError(null); }} />
      <Text style={ui.heading}>Remaining Packaged Queue</Text>
      {queue.filter((row) => row.id !== current.id).map((row) => <Pressable key={row.id} accessibilityRole="button"
        accessibilityLabel={`Verify queued ${row.draft.name}`} style={styles.item} onPress={() => { setActiveId(row.id); setError(null); }}>
        <Text style={ui.heading}>{row.product.emoji} {row.draft.name}</Text><Text style={ui.text}>{row.confirmed ? 'Reviewed' : 'In queue'} →</Text>
      </Pressable>)}
      <PrimaryButton label="Auto-Estimate Pending Items" variant="ghost" onPress={() => {
        setQueue((previous) => previous.map((row) => row.confirmed ? row : { ...row,
          draft: { ...row.draft, expiresOn: dateAfter(row.product.estimateDays) }, expirySource: 'PRESET_ESTIMATE', confirmed: true }));
        review();
      }} />
    </View>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {queue.length > 0 && <PrimaryButton label="Review Queue" variant="ghost" disabled={stage === 'loading'} onPress={review} />}
  </View>;
}
const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: Spacing.xs },
  segment: { flex: 1, height: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceContainerHigh },
  stamp: { ...ui.label, color: Colors.white, backgroundColor: Colors.primary, padding: Spacing.sm, borderRadius: Radius.sm },
  banner: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  viewfinder: { minHeight: 240, backgroundColor: '#0F172A', borderRadius: Radius.xl, padding: Spacing.base,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md, borderWidth: 3, borderColor: Colors.primary },
  cameraText: { ...ui.text, color: Colors.white, textAlign: 'center' },
  item: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  selected: { backgroundColor: Colors.surfaceContainerHigh },
  error: { ...ui.text, color: Colors.error },
});
