import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import ExpiryBadge from '@/components/ExpiryBadge';
import { ui } from '@/components/PrototypeScreen';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { MOCK_CURRENCY } from '@/lib/mock';
import { useMockPantry } from '@/context/MockPantryContext';
import { expiryDays, PANTRY_CATEGORIES, validatePantryDraft, type PantryDraft } from '@/lib/pantry';
import { MOCK_RECEIPT, newReceiptCandidates, prepareReceiptImport, receiptDuplicates, type ReceiptCandidate } from '@/lib/receipt';

type Stage = 'ready' | 'loading' | 'review' | 'confirm' | 'saved' | 'empty' | 'error';

/** Receipt prototype: editable reference rows, explicit review, no camera/OCR or persistence. */
export default function ReceiptReview() {
  const { items, addReceipt } = useMockPantry();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [stage, setStage] = useState<Stage>('ready');
  const [rows, setRows] = useState<ReceiptCandidate[]>([]);
  const [editor, setEditor] = useState<{ id: string; draft: PantryDraft } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef(false);
  const nextMissing = useRef(0);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const scan = (retry = false) => {
    if (timer.current) clearTimeout(timer.current);
    setEditor(null); setError(null); setStage('loading'); submitted.current = false;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!retry && (preview === 'error' || preview === 'empty')) { setRows([]); setStage(preview); return; }
      setRows(newReceiptCandidates()); setStage('review');
    }, 900);
  };
  const selected = rows.filter((row) => row.selected);
  const importPlan = prepareReceiptImport(rows, items, 'preview');
  const update = (id: string, change: Partial<ReceiptCandidate>) => {
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, ...change } : row));
    setError(null);
  };
  const openEditor = (row: ReceiptCandidate) => { setEditor({ id: row.id, draft: { ...row.draft } }); setError(null); };
  const changeDraft = <K extends keyof PantryDraft>(key: K, value: PantryDraft[K]) => {
    setEditor((previous) => previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : null); setError(null);
  };

  if (stage === 'saved') return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>✓ Haul added</Text>
    <Text style={ui.text}>{savedIds.length} groceries added to shared kitchen inventory. Reloading resets this demo.</Text>
    <PrimaryButton label="View Pantry" onPress={() => router.push({ pathname: '/(tabs)/pantry', params: { added: savedIds[0] } })} />
    <PrimaryButton label="Scan Another Receipt" variant="ghost" onPress={() => scan(true)} />
  </View>;

  if (editor) return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>Edit Grocery</Text>
    <FormInput label="Item name" accessibilityLabel="Receipt item name" value={editor.draft.name} onChangeText={(v) => changeDraft('name', v)} maxLength={120} />
    <Text style={ui.heading}>Category</Text>
    <View style={styles.choices}>{PANTRY_CATEGORIES.map((category) => <Pressable key={category.name} accessibilityRole="radio"
      accessibilityState={{ checked: editor.draft.category === category.name }} accessibilityLabel={category.name}
      style={[ui.pill, editor.draft.category === category.name && { backgroundColor: Colors.primary }]}
      onPress={() => changeDraft('category', category.name)}><Text style={[ui.label, editor.draft.category === category.name && { color: Colors.white }]}>{category.name}</Text></Pressable>)}</View>
    <FormInput label="Quantity" accessibilityLabel="Receipt quantity" keyboardType="decimal-pad" value={editor.draft.quantity} onChangeText={(v) => changeDraft('quantity', v)} />
    <FormInput label="Unit" accessibilityLabel="Receipt unit" value={editor.draft.unit} onChangeText={(v) => changeDraft('unit', v)} maxLength={40} />
    <FormInput label={`Whole-entry value (${MOCK_CURRENCY.symbol}, optional)`} accessibilityLabel="Receipt purchase value" keyboardType="decimal-pad" value={editor.draft.price} onChangeText={(v) => changeDraft('price', v)} />
    <Text style={ui.text}>Unknown values count as $0 for this demo. Value applies to the whole entry.</Text>
    <FormInput label="Expiry date (YYYY-MM-DD)" accessibilityLabel="Receipt expiry date" value={editor.draft.expiresOn} onChangeText={(v) => changeDraft('expiresOn', v)} maxLength={10} />
    <Text style={ui.text}>Changing the suggested date marks it as user entered. Keeping it retains the estimate; a package date is not verified by this demo.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <PrimaryButton label="Save Grocery Changes" onPress={() => {
      const issue = validatePantryDraft(editor.draft);
      if (issue) { setError(issue); return; }
      // Clear choices after edits so changed names/quantities are reviewed again.
      setRows((previous) => {
        const updated = previous.map((row) => ({ ...row, duplicateChoice: undefined,
          ...(row.id === editor.id ? { draft: editor.draft } : {}) }));
        if (!previous.some((row) => row.id === editor.id)) updated.push({ id: editor.id, draft: editor.draft,
          estimatedDate: '', selected: true, duplicateChoice: undefined,
          emoji: PANTRY_CATEGORIES.find((category) => category.name === editor.draft.category)!.emoji,
          note: 'Added during receipt review' });
        return updated;
      });
      setEditor(null); setError(null);
    }} />
    <PrimaryButton label="Cancel Edit" variant="ghost" onPress={() => { setEditor(null); setError(null); }} />
  </View>;

  return <View style={{ gap: Spacing.base }}>
    <View style={styles.viewfinder}>
      <Text style={styles.cameraText}>🧾 {MOCK_RECEIPT.retailer}</Text>
      <Text style={styles.cameraText}>{stage === 'loading' ? 'Reading sample receipt…' : 'Sample receipt · camera not connected'}</Text>
    </View>
    {stage === 'ready' && <PrimaryButton label="Simulate Receipt Scan" onPress={() => scan()} />}
    {stage === 'loading' && <PrimaryButton label="Reading Receipt" loading onPress={() => {}} />}
    {(stage === 'empty' || stage === 'error') && <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.title}>{stage === 'empty' ? 'No groceries detected' : 'Receipt could not be read'}</Text>
      <Text style={ui.text}>Try the sample receipt again or enter groceries manually.</Text>
      <PrimaryButton label="Retry Receipt Scan" onPress={() => scan(true)} />
      <PrimaryButton label="Enter Item Manually" variant="ghost" onPress={() => router.push('/pantry/add')} />
    </View>}
    {(stage === 'review' || stage === 'confirm') && <View style={styles.sheet}>
      <Text accessibilityRole="header" style={ui.title}>{stage === 'confirm' ? 'Confirm Haul' : 'Haul Detected'}</Text>
      <Text style={ui.text}>{selected.length} of {rows.length} groceries selected · Review before adding</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={ui.text}>Selected value</Text><Text style={ui.heading}>${selected.reduce((sum, row) => sum + Number(row.draft.price.replace(',', '.') || 0), 0).toFixed(2)}</Text></View>
        <View style={styles.stat}><Text style={ui.text}>To add</Text><Text style={ui.heading}>{importPlan.items?.length ?? 'Review choices'}</Text></View>
      </View>
      {stage === 'review' ? <>
        <View style={ui.row}><Text style={ui.heading}>Parsed Groceries</Text><Pressable accessibilityRole="button" style={ui.pill}
          onPress={() => { setEditor({ id: `missing-${++nextMissing.current}`, draft: { name: '', category: 'Produce',
            quantity: '1', unit: '', price: '', expiresOn: '' } }); setError(null); }}><Text style={ui.label}>＋ Add Missing</Text></Pressable></View>
        {rows.map((row, index) => {
          const matches = receiptDuplicates(row, items, rows.slice(0, index));
          return <View key={row.id} style={styles.grocery}>
            <View style={ui.row}>
              <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${row.draft.name}`} accessibilityState={{ checked: row.selected }}
                style={styles.include} onPress={() => {
                  setRows((previous) => previous.map((item) => ({ ...item, duplicateChoice: undefined,
                    ...(item.id === row.id ? { selected: !item.selected } : {}) }))); setError(null);
                }}><Text style={ui.heading}>{row.selected ? '☑' : '☐'} {row.emoji}</Text></Pressable>
              <Text style={[ui.heading, { flex: 1 }]}>{row.draft.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${row.draft.name}`} style={ui.pill} onPress={() => openEditor(row)}><Text style={ui.label}>✎</Text></Pressable>
            </View>
            <Text style={ui.text}>{row.draft.category} · {row.draft.quantity} {row.draft.unit} · ${Number(row.draft.price.replace(',', '.') || 0).toFixed(2)}</Text>
            <ExpiryBadge daysLeft={expiryDays(row.draft.expiresOn)} expirySource={row.draft.expiresOn === row.estimatedDate ? 'PRESET_ESTIMATE' : 'USER_ENTERED'} />
            <Text style={ui.text}>{row.draft.expiresOn === row.estimatedDate ? row.note : 'User-entered date · package unverified'} · {row.draft.expiresOn}</Text>
            {row.selected && matches.length > 0 && <>
              <Text style={ui.text}>Possible duplicate: {matches.join(', ')}. Skip this row or add a separate purchase. Existing items stay unchanged.</Text>
              <View style={styles.choices}>{(['skip', 'separate'] as const).map((choice) => <Pressable key={choice} accessibilityRole="radio"
                accessibilityLabel={`${choice === 'skip' ? 'Skip' : 'Add separately'} ${row.draft.name}`} accessibilityState={{ checked: row.duplicateChoice === choice }}
                style={[ui.pill, row.duplicateChoice === choice && { backgroundColor: Colors.surfaceContainerHigh }]}
                onPress={() => update(row.id, { duplicateChoice: choice })}><Text style={ui.label}>{choice === 'skip' ? 'Skip' : 'Add separately'}</Text></Pressable>)}</View>
            </>}
          </View>;
        })}
        <Text style={ui.text}>Expiry suggestions remain estimates. No freshness alerts are scheduled in this prototype.</Text>
      </> : <>
        {importPlan.items?.map((item) => <Text key={item.id} style={ui.text}>{item.name} · {item.quantity} {item.unit} · ${item.price.toFixed(2)} · {item.expiresOn}</Text>)}
        <Text style={ui.text}>{selected.filter((row) => row.duplicateChoice === 'skip').length} selected rows skipped. Adding separate purchases never merges or consumes existing items.</Text>
      </>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <PrimaryButton label={stage === 'review' ? 'Review Haul to Add' : 'Confirm Add Haul to Kitchen Inventory'} disabled={!selected.length}
        onPress={() => {
          if (stage === 'review') {
            if (importPlan.error) { setError(importPlan.error); return; }
            setStage('confirm'); setError(null); return;
          }
          if (submitted.current) return;
          const result = addReceipt(rows);
          if (result.error) { setError(result.error); setStage('review'); return; }
          submitted.current = true; setSavedIds(result.ids); setStage('saved');
        }} />
      {stage === 'confirm' ? <PrimaryButton label="Back to Review" variant="ghost" onPress={() => setStage('review')} /> :
        <PrimaryButton label="Discard Review and Scan Again" variant="ghost" onPress={() => scan(true)} />}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  viewfinder: { backgroundColor: '#0F172A', borderRadius: Radius.xl, minHeight: 240, justifyContent: 'center', alignItems: 'center', padding: Spacing.base, gap: Spacing.md, borderWidth: 3, borderColor: Colors.primary },
  cameraText: { ...ui.text, color: Colors.white, textAlign: 'center' },
  sheet: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.base, gap: Spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { flex: 1, minWidth: 100, borderRadius: Radius.lg, backgroundColor: Colors.surfaceContainerLow, padding: Spacing.md },
  grocery: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  include: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { ...ui.text, color: Colors.error },
});
