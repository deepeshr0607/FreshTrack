import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import PantryExpiryFields from '@/components/PantryExpiryFields';
import { expiryDraft } from '@/lib/pantryExpiry';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import { PANTRY_CATEGORIES, type PantryDraft } from '@/lib/pantry';
import type { ReceiptReviewInput } from '@/types/api';
import { reviewedReceiptInput } from '@/lib/receiptImport';
import { manualReceiptCandidate, parseReceiptCandidates, suggestReceiptNameOnlyItems, pairReceiptLines, usedReceiptLineIds, receiptReviewSummary, receiptExpiryDraft, saveReceiptCandidate, receiptExpiryLabel, type LocalReceiptCandidate } from '@/lib/receiptCandidates';

/** OCR stays local; only an explicit reviewed-fields handoff can prepare a server import. */
export default function LocalReceiptReview({ lines, onPrepare, localOnly = false }: { lines: string[]; onPrepare(input: ReceiptReviewInput): void; localOnly?: boolean }) {
  const [parsed] = useState(() => parseReceiptCandidates(lines));
  const [rows, setRows] = useState(() => suggestReceiptNameOnlyItems(parsed));
  const [editor, setEditor] = useState<LocalReceiptCandidate | null>(null);
  const [expiry, setExpiry] = useState(expiryDraft());
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const [nameLine, setNameLine] = useState<string | null>(null);
  const [amountLine, setAmountLine] = useState<string | null>(null);
  const next = useRef(0);
  const plan = receiptReviewSummary(rows);
  const usedLines = usedReceiptLineIds(rows);
  const remaining = parsed.remaining.filter(line => !usedLines.has(line.id));
  const change = <K extends keyof PantryDraft>(key: K, value: PantryDraft[K]) => {
    setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : null); setError('');
  };
  const edit = (row: LocalReceiptCandidate) => { setEditor({ ...row, draft: { ...row.draft } }); setExpiry(receiptExpiryDraft(row)); setError(''); };
  const add = (original = '', lineId?: string) => { if (rows.length >= 20) return; edit({ ...manualReceiptCandidate(`manual-${++next.current}`, original), ...(lineId ? { sourceLineIds: [lineId] } : {}) }); };
  if (editor) return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Review Grocery</Text>
    {!!editor.original && <Text selectable style={ui.text}>Original OCR: {editor.original}</Text>}
    {editor.sourceLineIds?.length === 2 && <Text style={ui.text}>You matched two separate OCR lines. Check the name and amount against your receipt photo; text order does not establish a match.</Text>}
    <Text style={ui.text}>Verify every field. Quantity, unit and expiry are not read from the receipt. Category starts as Other. Value applies to the whole entry in INR; blank means unknown, zero means free.</Text>
    {editor.detectedPrice && <Text style={ui.text}>Detected amount: {editor.detectedPrice} ({editor.currency === 'INR' ? 'INR marker detected' : editor.currency === 'unsupported' ? 'foreign currency — not converted or copied' : 'currency not detected — confirm INR before keeping this value'}). This may be a unit price rather than the entry total.</Text>}
    <FormInput label="Item name" accessibilityLabel="Reviewed item name" value={editor.draft.name} maxLength={120} onChangeText={v => change('name', v)} />
    <Text style={ui.heading}>Category</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PANTRY_CATEGORIES.map(category => <Pressable key={category.name}
      accessibilityRole="radio" accessibilityLabel={category.name} accessibilityState={{ checked: category.name === editor.draft.category }}
      style={[ui.pill, category.name === editor.draft.category && { backgroundColor: Colors.primary }]} onPress={() => change('category', category.name)}>
      <Text style={[ui.label, category.name === editor.draft.category && { color: Colors.white }]}>{category.emoji} {category.name}</Text></Pressable>)}</View>
    <FormInput label="Quantity" accessibilityLabel="Reviewed quantity" keyboardType="decimal-pad" value={editor.draft.quantity} onChangeText={v => change('quantity', v)} />
    <FormInput label="Unit (e.g. piece, bag, kg)" accessibilityLabel="Reviewed unit" maxLength={32} value={editor.draft.unit} onChangeText={v => change('unit', v)} />
    <FormInput label="Whole-entry purchase value (₹, optional)" accessibilityLabel="Reviewed purchase value" keyboardType="decimal-pad" value={editor.draft.price} onChangeText={v => change('price', v)} />
    <PantryExpiryFields name={editor.draft.name} category={editor.draft.category.toUpperCase() as Parameters<typeof PantryExpiryFields>[0]['category']}
      value={expiry} onChange={value => { setExpiry(value); setError(''); }} />
    <Text style={ui.text}>Enter a package date only after checking the printed use-by or best-before label. A receipt date does not verify package expiry. Estimates are optional tracking assumptions.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    <PrimaryButton label="Save Grocery Review" onPress={() => {
      let saved: LocalReceiptCandidate;
      try { saved = saveReceiptCandidate(editor, expiry); } catch (error) { setError((error as Error).message); return; }
      setRows(previous => previous.some(row => row.id === saved.id) ? previous.map(row => row.id === saved.id ? saved : row) : [...previous, saved]);
      setEditor(null); setNameLine(null); setAmountLine(null); setError('');
    }} />
    <PrimaryButton label="Cancel Edit" variant="ghost" onPress={() => { setEditor(null); setError(''); }} />
  </View>;
  return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>{summary ? 'Reviewed Haul Preview' : 'Haul Detected'}</Text>
    <Text style={ui.text}>Review stays local until you continue and confirm import. Leaving or reading another photo discards unconfirmed edits.</Text>
    {summary ? <>
      <Text style={ui.heading}>{plan.rows.length} reviewed groceries</Text>
      {plan.rows.map(row => <View key={row.id} style={ui.card}><Text style={ui.heading}>{row.draft.name}</Text>
        <Text style={ui.text}>{row.draft.category} · {row.draft.quantity} {row.draft.unit} · {row.draft.price.trim() ? `₹${row.draft.price}` : 'Unknown value'} · {receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection })}</Text></View>)}
      {!!plan.repeated.length && <Text style={ui.text}>Repeated names in this haul: {plan.repeated.join(', ')}. These rows remain separate. The next step checks household duplicates and requires separate-purchase choices.</Text>}
      <Text style={ui.text}>{localOnly ? 'Local parser exercise: preview the reviewed fields below. No household checks or Pantry writes will run.' : 'Nothing has been saved to Pantry. Continue to household duplicate review before confirming.'}</Text>
      <PrimaryButton label={localOnly ? 'Preview Confirmed Fields (Local Only)' : 'Check Duplicates & Continue'} onPress={() => {
        try { onPrepare(reviewedReceiptInput(rows)); } catch { setError('Check the selected groceries before continuing.'); }
      }} />
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Back to Review" variant="ghost" onPress={() => setSummary(false)} />
    </> : <>
      <Text style={ui.text}>{rows.length} candidates · {rows.filter(row => row.selected).length} reviewed and selected · no accuracy score inferred</Text>
      {!rows.length && <Text style={ui.text}>No grocery candidates found. Match separate name/amount lines below or add a missing grocery.</Text>}
      <Text style={ui.text}>Common food names can be suggested without a price. Their value stays unknown until you enter it. Check every suggestion; unfamiliar names remain in unassigned lines.</Text>
      {rows.map(row => <View key={row.id} style={[ui.card, { backgroundColor: Colors.surfaceContainerLow }]}>
        <Text style={ui.heading}>{row.draft.name || 'Unnamed grocery'}</Text>
        {!row.reviewed && row.detectedPrice === null && <Text style={ui.text}>Name detected without a price · value unknown. Review it, or remove this suggestion to match its name with a separate amount below.</Text>}
        <Text style={ui.text}>{row.reviewed ? `${row.draft.quantity} ${row.draft.unit} · ${row.draft.price.trim() ? `₹${row.draft.price}` : 'Unknown value'} · ${receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection })}` : 'Needs review · quantity, unit, category, value and expiry unverified'}</Text>
        <Text selectable style={ui.text}>Original OCR: {row.original || 'Added manually'}</Text>
        <PrimaryButton label={row.reviewed ? 'Edit Grocery' : 'Review Grocery'} variant="ghost" onPress={() => edit(row)} />
        {row.reviewed && <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${row.draft.name}`} accessibilityState={{ checked: row.selected }} style={ui.pill}
          onPress={() => setRows(previous => previous.map(item => item.id === row.id ? { ...item, selected: !item.selected } : item))}>
          <Text style={ui.label}>{row.selected ? '☑ Included' : '☐ Excluded'}</Text></Pressable>}
        <PrimaryButton label="Remove Grocery" variant="ghost" onPress={() => { setRows(previous => previous.filter(item => item.id !== row.id)); setError(''); }} />
      </View>)}
      <PrimaryButton label="＋ Add Missing" variant="ghost" disabled={rows.length >= 20} onPress={() => add()} />
      <Text style={ui.text}>Up to 20 review rows. Unassigned lines remain available below, including likely totals and unsupported layouts. No lines are silently imported.</Text>
      <Text style={ui.text}>Separate name and price columns? Show unassigned lines, choose one item name and its amount using the photo, then review the match. Remove a matched grocery to make its lines available again. Totals, unclear lines and unsupported formats stay available for manual entry.</Text>
      <PrimaryButton label={`${showRemaining ? 'Hide' : 'Show'} Unassigned Lines (${remaining.length})`} variant="ghost" onPress={() => setShowRemaining(previous => !previous)} />
      {showRemaining && <>
        {(nameLine || amountLine) && <View style={ui.card}>
          <Text style={ui.heading}>Match Separate Lines</Text>
          <Text selectable style={ui.text}>Name: {remaining.find(line => line.id === nameLine)?.original ?? 'Choose an item-name line below'}</Text>
          <Text selectable style={ui.text}>Amount: {remaining.find(line => line.id === amountLine)?.original ?? 'Choose an amount line below'}</Text>
          <PrimaryButton label="Review Matched Lines" disabled={!nameLine || !amountLine || rows.length >= 20} onPress={() => {
            try { edit(pairReceiptLines(parsed.remaining, nameLine!, amountLine!, rows)); }
            catch (error) { setError((error as Error).message); }
          }} />
          <PrimaryButton label="Cancel Match" variant="ghost" onPress={() => { setNameLine(null); setAmountLine(null); setError(''); }} />
        </View>}
        {remaining.map(line => <View key={line.id} style={ui.card}><Text selectable style={ui.text}>{line.original}</Text><Text style={ui.text}>{line.reason}</Text>
          {line.kind === 'name' && <PrimaryButton label={nameLine === line.id ? 'Selected Item Name' : 'Use as Item Name'} variant={nameLine === line.id ? 'primary' : 'secondary'} disabled={rows.length >= 20}
            onPress={() => { setNameLine(previous => previous === line.id ? null : line.id); setError(''); }} />}
          {line.kind === 'amount' && <PrimaryButton label={amountLine === line.id ? 'Selected Amount' : 'Use as Amount'} variant={amountLine === line.id ? 'primary' : 'secondary'} disabled={rows.length >= 20}
            onPress={() => { setAmountLine(previous => previous === line.id ? null : line.id); setError(''); }} />}
          <PrimaryButton label="Review as Grocery" variant="ghost" disabled={rows.length >= 20} onPress={() => add(line.original, line.id)} />
        </View>)}
      </>}
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Preview Reviewed Haul" disabled={!rows.some(row => row.selected)} onPress={() => {
        if (plan.error) { setError(plan.error); return; } setError(''); setSummary(true);
      }} />
    </>}
  </View>;
}
