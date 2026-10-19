import type { ReceiptColumnMode } from '@/lib/receiptColumnReview';
import ReceiptColumnMatches from './ReceiptColumnMatches';
import type { ReceiptTextBox } from '@/lib/receiptTextBoxes';
import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import PantryExpiryFields from '@/components/PantryExpiryFields';
import ReceiptExpirySuggestion from './ReceiptExpirySuggestion';
import ReceiptEstimateBatch from './ReceiptEstimateBatch';
import ReceiptPackageDateReview from './ReceiptPackageDateReview';
import { receiptPackageDateLabel, type ReceiptPackageDateReview as PackageReview } from '@/lib/receiptPackageDates';
import { applyReceiptEstimateBatch } from '@/lib/receiptBatchEstimates';
import { expiryDraft, kolkataToday } from '@/lib/pantryExpiry';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import { PANTRY_CATEGORIES, type PantryDraft } from '@/lib/pantry';
import type { ReceiptReviewInput } from '@/types/api';
import { reviewedReceiptInput } from '@/lib/receiptImport';
import { manualReceiptCandidate, parseReceiptCandidates, suggestReceiptNameOnlyItems, pairReceiptLines, usedReceiptLineIds, receiptReviewSummary, receiptExpiryDraft, saveReceiptCandidate, receiptExpiryLabel, type LocalReceiptCandidate } from '@/lib/receiptCandidates';
import { receiptQuantityHint, applyReceiptQuantityHint } from '@/lib/receiptQuantity';
import { receiptNameSuggestion, applyReceiptNameSuggestion } from '@/lib/receiptNameAliases';

import { RECEIPT_MAX_ITEMS } from '@/lib/receiptLimits';
import { recognizeReceiptFood, applyReceiptFoodCategory } from '@/lib/receiptFoodRecognition';

/** OCR stays local; only an explicit reviewed-fields handoff can prepare a server import. */
export default function LocalReceiptReview({ lines, layout = null, onPrepare, localOnly = false }: { lines: string[]; layout?: ReceiptTextBox[] | null; onPrepare(input: ReceiptReviewInput): void; localOnly?: boolean }) {
  const [parsed] = useState(() => parseReceiptCandidates(lines));
  const [rows, setRows] = useState(() => suggestReceiptNameOnlyItems(parsed));
  const [editor, setEditor] = useState<LocalReceiptCandidate | null>(null);
  const [expiry, setExpiry] = useState(expiryDraft());
  const [receiptDate, setReceiptDate] = useState('');
  const [columnMode, setColumnMode] = useState<ReceiptColumnMode>('same-row');
  const [packageReview, setPackageReview] = useState<PackageReview>({ kind: 'unchecked' });
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const page = Math.min(reviewPage, pageCount - 1);
  const visibleRows = rows.slice(page * 10, (page + 1) * 10);
  const [showRemaining, setShowRemaining] = useState(false);
  const [nameLine, setNameLine] = useState<string | null>(null);
  const [amountLine, setAmountLine] = useState<string | null>(null);
  const next = useRef(0);
  const plan = receiptReviewSummary(rows);
  const usedLines = usedReceiptLineIds(rows);
  const quantityHint = editor ? receiptQuantityHint(editor.draft.name) : null;
  const nameSuggestion = editor ? receiptNameSuggestion(editor.draft.name) : null;
  const foodSuggestion = editor ? recognizeReceiptFood(editor.draft.name) : null;
  const remaining = parsed.remaining.filter(line => !usedLines.has(line.id));
  const change = <K extends keyof PantryDraft>(key: K, value: PantryDraft[K]) => {
    if (key === 'name') setPackageReview({ kind: 'unchecked' });
    setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : null); setError('');
  };
  const edit = (row: LocalReceiptCandidate) => { setEditor({ ...row, draft: { ...row.draft } }); setExpiry(receiptExpiryDraft(row)); setPackageReview(row.packageDateReview ?? { kind: 'unchecked' }); setError(''); };
  const changeExpiry = (value: typeof expiry) => {
    if (value.packageDate !== expiry.packageDate) setPackageReview({ kind: 'unchecked' });
    setExpiry(value); setError('');
  };
  const add = (original = '', lineId?: string) => { if (rows.length >= RECEIPT_MAX_ITEMS) return; edit({ ...manualReceiptCandidate(`manual-${++next.current}`, original), ...(lineId ? { sourceLineIds: [lineId] } : {}) }); };
  if (editor) return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Review Grocery</Text>
    {!!editor.original && <Text selectable style={ui.text}>Original OCR: {editor.original}</Text>}
    {(editor.sourceLineIds?.length ?? 0) > 1 && <Text style={ui.text}>Matched receipt lines: compare the original name and amount with your photo. A suggested match is unverified; a structural code is not a purchased quantity.</Text>}
    <Text style={ui.text}>Verify every field. Clear quantity text can be offered as a suggestion; apply it only after checking the receipt. Expiry is not read from the receipt. Category starts as Other. Value applies to the whole entry in INR; blank means unknown, zero means free.</Text>
    {editor.detectedPrice && <Text style={ui.text}>Detected amount: {editor.detectedPrice} ({editor.currency === 'INR' ? 'INR marker detected' : editor.currency === 'unsupported' ? 'foreign currency — not converted or copied' : 'currency not detected — confirm INR before keeping this value'}). This may be a unit price rather than the entry total.</Text>}
    {nameSuggestion && <View style={ui.card}>
      <Text style={ui.text}>Suggested name: {nameSuggestion.name}. This is an abbreviation match, not a verified product identity. Compare it with your receipt before using it.</Text>
      <PrimaryButton label="Use Suggested Name" variant="ghost" onPress={() => {
        setPackageReview({ kind: 'unchecked' });
        setEditor(previous => previous ? { ...previous, draft: applyReceiptNameSuggestion(previous.draft) } : null); setError('');
      }} />
    </View>}
    <FormInput label="Item name" accessibilityLabel="Reviewed item name" value={editor.draft.name} maxLength={120} onChangeText={v => change('name', v)} />
    <Text style={ui.heading}>Category</Text>
    {foodSuggestion?.status === 'matched' ? <View style={ui.card}>
      <Text style={ui.text}>Detected food: {foodSuggestion.label} · Suggested category: {foodSuggestion.category}. Check the item name and choose the category that fits. This does not assign an expiry date.</Text>
      {foodSuggestion.category !== editor.draft.category && <PrimaryButton label="Use Suggested Category" variant="ghost" onPress={() => {
        setEditor(previous => previous ? { ...previous, draft: applyReceiptFoodCategory(previous.draft) } : null); setError('');
      }} />}
    </View> : <Text style={ui.text}>Category needs review: {foodSuggestion?.status === 'ambiguous' ? 'this name may describe a mixed or prepared product' : 'this food name is not recognized'}. Choose a category yourself; Other is available.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PANTRY_CATEGORIES.map(category => <Pressable key={category.name}
      accessibilityRole="radio" accessibilityLabel={category.name} accessibilityState={{ checked: category.name === editor.draft.category }}
      style={[ui.pill, category.name === editor.draft.category && { backgroundColor: Colors.primary }]} onPress={() => change('category', category.name)}>
      <Text style={[ui.label, category.name === editor.draft.category && { color: Colors.white }]}>{category.emoji} {category.name}</Text></Pressable>)}</View>
    {quantityHint && <View style={ui.card}>
      <Text style={ui.text}>Detected quantity: {quantityHint.quantity}{quantityHint.unit ? ` ${quantityHint.unit}` : ' · unit not detected; choose it yourself'}. Confirm this is the purchased quantity, not a package size. Purchase value is not multiplied.</Text>
      <PrimaryButton label="Use Detected Quantity" variant="ghost" onPress={() => {
        setEditor(previous => previous ? { ...previous, draft: applyReceiptQuantityHint(previous.draft) } : null); setError('');
      }} />
    </View>}
    <FormInput label="Quantity" accessibilityLabel="Reviewed quantity" keyboardType="decimal-pad" value={editor.draft.quantity} onChangeText={v => change('quantity', v)} />
    <FormInput label="Unit (e.g. piece, bag, kg)" accessibilityLabel="Reviewed unit" maxLength={32} value={editor.draft.unit} onChangeText={v => change('unit', v)} />
    <FormInput label="Whole-entry purchase value (₹, optional)" accessibilityLabel="Reviewed purchase value" keyboardType="decimal-pad" value={editor.draft.price} onChangeText={v => change('price', v)} />
    <ReceiptExpirySuggestion key={`${editor.id}:${editor.draft.name}`} name={editor.draft.name} value={expiry} confirmedPurchaseDate={receiptDate} onChange={changeExpiry} />
    <PantryExpiryFields useLegacyPresets={false} name={editor.draft.name} category={editor.draft.category.toUpperCase() as Parameters<typeof PantryExpiryFields>[0]['category']}
      packageDateConfirmed={packageReview.kind === 'printed' && packageReview.name === editor.draft.name && packageReview.date === expiry.packageDate}
      value={expiry} onChange={changeExpiry} />
    <ReceiptPackageDateReview name={editor.draft.name} expiry={expiry} review={packageReview}
      onReview={value => { setPackageReview(value); setError(''); }} onExpiry={changeExpiry} />
    <Text style={ui.text}>Enter a package date only after checking the printed use-by or best-before label. A receipt date does not verify package expiry. Estimates are optional tracking assumptions.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    <PrimaryButton label="Save Grocery Review" onPress={() => {
      let saved: LocalReceiptCandidate;
      try { saved = saveReceiptCandidate({ ...editor, packageDateReview: packageReview }, expiry); } catch (error) { setError((error as Error).message); return; }
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
        <Text style={ui.text}>{receiptPackageDateLabel(row.packageDateReview)}</Text>
        <Text style={ui.text}>{row.draft.category} · {row.draft.quantity} {row.draft.unit} · {row.draft.price.trim() ? `₹${row.draft.price}` : 'Unknown value'} · {receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection })}</Text></View>)}
      {!!plan.repeated.length && <Text style={ui.text}>Repeated names in this haul: {plan.repeated.join(', ')}. These rows remain separate. The next step checks household duplicates and requires separate-purchase choices.</Text>}
      <Text style={ui.text}>{localOnly ? 'Local parser exercise: preview the reviewed fields below. No household checks or Pantry writes will run.' : 'Nothing has been saved to Pantry. Continue to household duplicate review before confirming.'}</Text>
      <PrimaryButton label={localOnly ? 'Preview Confirmed Fields (Local Only)' : 'Check Duplicates & Continue'} onPress={() => {
        try { onPrepare(reviewedReceiptInput(rows)); } catch { setError('Check the selected groceries before continuing.'); }
      }} />
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Back to Review" variant="ghost" onPress={() => setSummary(false)} />
    </> : <>
      {layout && <ReceiptColumnMatches lines={lines} layout={layout} rows={rows} mode={columnMode} onMode={setColumnMode} onReview={edit} />}
      <ReceiptEstimateBatch rows={rows} confirmedDate={receiptDate} onConfirmDate={setReceiptDate}
        onApply={preview => { setRows(applyReceiptEstimateBatch(rows, preview, kolkataToday())); setError(''); }} />
      <Text style={ui.text}>{rows.length} candidates · {rows.filter(row => row.selected).length} reviewed and selected · no accuracy score inferred</Text>
      {!rows.length && <Text style={ui.text}>No grocery candidates found. Match separate name/amount lines below or add a missing grocery.</Text>}
      <Text style={ui.text}>Common food names can be suggested without a price. Their value stays unknown until you enter it. Check every suggestion; unfamiliar names remain in unassigned lines.</Text>
      {rows.length > 10 && <View style={ui.card}>
        <Text accessibilityLiveRegion="polite" style={ui.text}>Items {page * 10 + 1}–{Math.min((page + 1) * 10, rows.length)} of {rows.length} · Page {page + 1} of {pageCount}. Reviews and selections are kept across pages.</Text>
        <PrimaryButton label="Previous Items" variant="ghost" disabled={page === 0} onPress={() => setReviewPage(page - 1)} />
        <PrimaryButton label="Next Items" variant="ghost" disabled={page === pageCount - 1} onPress={() => setReviewPage(page + 1)} />
      </View>}
      {visibleRows.map(row => <View key={row.id} style={[ui.card, { backgroundColor: Colors.surfaceContainerLow }]}>
        <Text style={ui.heading}>{row.draft.name || 'Unnamed grocery'}</Text>
        <Text style={ui.text}>{receiptPackageDateLabel(row.packageDateReview)}</Text>
        {!row.reviewed && !!row.draft.expiresOn && <Text style={ui.text}>Estimated: {row.draft.expiresOn} · Review remaining fields before selecting for import.</Text>}
        {!row.reviewed && <ReceiptCategoryHint name={row.draft.name} />}
        {!row.reviewed && row.detectedPrice === null && <Text style={ui.text}>Name detected without a price · value unknown. Review it, or remove this suggestion to match its name with a separate amount below.</Text>}
        <Text style={ui.text}>{row.reviewed ? `${row.draft.quantity} ${row.draft.unit} · ${row.draft.price.trim() ? `₹${row.draft.price}` : 'Unknown value'} · ${receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection })}` : 'Needs review · quantity, unit, category, value and expiry unverified'}</Text>
        <Text selectable style={ui.text}>Original OCR: {row.original || 'Added manually'}</Text>
        <PrimaryButton label={row.reviewed ? 'Edit Grocery' : 'Review Grocery'} variant="ghost" onPress={() => edit(row)} />
        {row.reviewed && <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${row.draft.name}`} accessibilityState={{ checked: row.selected }} style={ui.pill}
          onPress={() => setRows(previous => previous.map(item => item.id === row.id ? { ...item, selected: !item.selected } : item))}>
          <Text style={ui.label}>{row.selected ? '☑ Included' : '☐ Excluded'}</Text></Pressable>}
        <PrimaryButton label="Remove Grocery" variant="ghost" onPress={() => { setRows(previous => previous.filter(item => item.id !== row.id)); setError(''); }} />
      </View>)}
      <PrimaryButton label="＋ Add Missing" variant="ghost" disabled={rows.length >= RECEIPT_MAX_ITEMS} onPress={() => add()} />
      <Text style={ui.text}>Up to {RECEIPT_MAX_ITEMS} review rows. Unassigned lines remain available below, including likely totals and unsupported layouts. No lines are silently imported.</Text>
      <Text style={ui.text}>Separate name and price columns? Show unassigned lines, choose one item name and its amount using the photo, then review the match. Remove a matched grocery to make its lines available again. Totals, unclear lines and unsupported formats stay available for manual entry.</Text>
      <PrimaryButton label={`${showRemaining ? 'Hide' : 'Show'} Unassigned Lines (${remaining.length})`} variant="ghost" onPress={() => setShowRemaining(previous => !previous)} />
      {showRemaining && <>
        {(nameLine || amountLine) && <View style={ui.card}>
          <Text style={ui.heading}>Match Separate Lines</Text>
          <Text selectable style={ui.text}>Name: {remaining.find(line => line.id === nameLine)?.original ?? 'Choose an item-name line below'}</Text>
          <Text selectable style={ui.text}>Amount: {remaining.find(line => line.id === amountLine)?.original ?? 'Choose an amount line below'}</Text>
          <PrimaryButton label="Review Matched Lines" disabled={!nameLine || !amountLine || rows.length >= RECEIPT_MAX_ITEMS} onPress={() => {
            try { edit(pairReceiptLines(parsed.remaining, nameLine!, amountLine!, rows)); }
            catch (error) { setError((error as Error).message); }
          }} />
          <PrimaryButton label="Cancel Match" variant="ghost" onPress={() => { setNameLine(null); setAmountLine(null); setError(''); }} />
        </View>}
        {remaining.map(line => <View key={line.id} style={ui.card}><Text selectable style={ui.text}>{line.original}</Text><Text style={ui.text}>{line.reason}</Text>
          {line.kind === 'name' && <PrimaryButton label={nameLine === line.id ? 'Selected Item Name' : 'Use as Item Name'} variant={nameLine === line.id ? 'primary' : 'secondary'} disabled={rows.length >= RECEIPT_MAX_ITEMS}
            onPress={() => { setNameLine(previous => previous === line.id ? null : line.id); setError(''); }} />}
          {line.kind === 'amount' && <PrimaryButton label={amountLine === line.id ? 'Selected Amount' : 'Use as Amount'} variant={amountLine === line.id ? 'primary' : 'secondary'} disabled={rows.length >= RECEIPT_MAX_ITEMS}
            onPress={() => { setAmountLine(previous => previous === line.id ? null : line.id); setError(''); }} />}
          <PrimaryButton label="Review as Grocery" variant="ghost" disabled={rows.length >= RECEIPT_MAX_ITEMS} onPress={() => add(line.original, line.id)} />
        </View>)}
      </>}
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Preview Reviewed Haul" disabled={!rows.some(row => row.selected)} onPress={() => {
        if (plan.error) { setError(plan.error); return; } setError(''); setSummary(true);
      }} />
    </>}
  </View>;
}

function ReceiptCategoryHint({ name }: { name: string }) {
  const food = recognizeReceiptFood(name);
  return <Text style={ui.text}>{food.status === 'matched' ? `Detected ${food.label} · Suggested ${food.category} · Review to apply` : 'Category needs review · Other until you choose'}</Text>;
}
