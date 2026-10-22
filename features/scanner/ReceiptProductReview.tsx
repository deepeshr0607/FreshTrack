import React, { useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import PrimaryButton from '@/components/PrimaryButton';
import FormInput from '@/components/FormInput';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import type { ReceiptReviewInput } from '@/types/api';
import type { ReceiptTextBox } from '@/lib/receiptTextBoxes';
import { PANTRY_CATEGORIES, type PantryDraft } from '@/lib/pantry';
import { expiryDraft, kolkataToday, resolveExpiry } from '@/lib/pantryExpiry';
import { manualReceiptCandidate, receiptExpiryDraft, saveReceiptCandidate, type LocalReceiptCandidate } from '@/lib/receiptCandidates';
import { receiptProducts, automaticFreshRule, receiptProductKind, receiptProductReviewState } from '@/lib/receiptProducts';
import { reviewedReceiptInput } from '@/lib/receiptImport';
import { confirmPrintedReceiptDate } from '@/lib/receiptPackageDates';
import { RECEIPT_MAX_ITEMS } from '@/lib/receiptLimits';
import { ReceiptProductCard, ReviewAction, ReviewDisclosure, ReviewHeading, ReviewStats, r } from './ReceiptReviewPresentation';
import PackageExpiryCapture from './PackageExpiryCapture';

/** Normal receipt UX. The diagnostic/manual parser exercise remains a separate screen. */
export default function ReceiptProductReview({ lines, layout, onPrepare, readOnly }: {
  lines: string[]; layout: ReceiptTextBox[] | null; onPrepare(input: ReceiptReviewInput): void; readOnly: boolean;
}) {
  const [today] = useState(kolkataToday);
  const [purchaseDate, setPurchaseDate] = useState(today), [dateInput, setDateInput] = useState(today);
  const [changingDate, setChangingDate] = useState(false);
  const [rows, setRows] = useState(() => receiptProducts(lines, layout, today));
  const modified = useRef(new Set<string>()), next = useRef(0);
  const [editor, setEditor] = useState<LocalReceiptCandidate | null>(null);
  const [expiry, setExpiry] = useState(expiryDraft());
  const [labelItem, setLabelItem] = useState<LocalReceiptCandidate | null>(null);
  const [error, setError] = useState(''), [page, setPage] = useState(0);
  const [packagePage, setPackagePage] = useState(0);
  const [showPackaged, setShowPackaged] = useState(false);
  const { included, pending, packaged, fresh, other } = receiptProductReviewState(rows);
  const packagePages = Math.max(1, Math.ceil(packaged.length / 10)), currentPackagePage = Math.min(packagePage, packagePages - 1);
  const pages = Math.max(1, Math.ceil(rows.length / 10)), currentPage = Math.min(page, pages - 1);
  const update = (row: LocalReceiptCandidate) => {
    modified.current.add(row.id);
    setRows(previous => previous.some(item => item.id === row.id) ? previous.map(item => item.id === row.id ? row : item) : [...previous, row]);
    setError('');
  };
  const edit = (row: LocalReceiptCandidate) => {
    setEditor({ ...row, draft: { ...row.draft } }); setExpiry(receiptExpiryDraft(row)); setError('');
  };
  const change = <K extends keyof PantryDraft>(key: K, value: PantryDraft[K]) => {
    setEditor(previous => previous ? { ...previous, ...(key === 'name' ? { productKind: undefined } : {}), draft: { ...previous.draft, [key]: value } } : null);
    // A new product name cannot inherit a confirmed printed label or another food's estimate.
    if (key === 'name') setExpiry(expiryDraft());
    setError('');
  };
  if (labelItem) return <PackageExpiryCapture key={labelItem.id} name={labelItem.draft.name} onCancel={() => setLabelItem(null)} onConfirm={date => {
    try {
      const saved = saveReceiptCandidate({ ...labelItem, packageDateReview: confirmPrintedReceiptDate(labelItem.draft.name, date) },
        { packageDate: date, userDate: '', baseDate: '', days: '' });
      update({ ...saved, selected: labelItem.selected }); setLabelItem(null);
    } catch (problem) { setLabelItem(null); edit(labelItem); setError((problem as Error).message); }
  }} />;
  if (editor) return <View style={r.card}>
    <ReviewHeading title="Edit product" subtitle="Make it right before it reaches your pantry." icon="pencil-outline" />
    <Text style={r.sectionTitle}>Product details</Text>
    <FormInput label="Product name" accessibilityLabel="Product name" value={editor.draft.name} maxLength={120} onChangeText={value => change('name', value)} />
    <Text style={r.sectionTitle}>Product type</Text>
    <View style={ui.row}>{(['fresh', 'packaged'] as const).map(kind => <Pressable key={kind} accessibilityRole="radio"
      accessibilityLabel={kind === 'fresh' ? 'Fresh or loose product' : 'Packaged product'} accessibilityState={{ checked: receiptProductKind(editor) === kind }}
      style={[ui.pill, receiptProductKind(editor) === kind && { backgroundColor: Colors.primary }]}
      onPress={() => { setEditor(previous => previous ? { ...previous, productKind: kind } : null); if (kind === 'packaged' && expiry.days) setExpiry(expiryDraft()); setError(''); }}>
      <Text style={[ui.label, receiptProductKind(editor) === kind && { color: Colors.white }]}>{kind === 'fresh' ? 'Fresh / loose' : 'Packaged'}</Text></Pressable>)}</View>
    <ReviewDisclosure title={`Category · ${editor.draft.category}`}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PANTRY_CATEGORIES.map(category => <Pressable key={category.name}
      accessibilityRole="radio" accessibilityLabel={category.name} accessibilityState={{ checked: editor.draft.category === category.name }}
      style={[ui.pill, editor.draft.category === category.name && { backgroundColor: Colors.primary }]}
      onPress={() => change('category', category.name)}><Text style={[ui.label, editor.draft.category === category.name && { color: Colors.white }]}>{category.emoji} {category.name}</Text></Pressable>)}</View>
    </ReviewDisclosure>
    <View style={r.fieldsRow}><View style={r.field}>
    <FormInput label="Quantity" accessibilityLabel="Quantity" value={editor.draft.quantity} keyboardType="decimal-pad" onChangeText={value => change('quantity', value)} />
    </View><View style={r.field}><FormInput label="Unit" accessibilityLabel="Unit" placeholder="piece, kg, l…" value={editor.draft.unit} maxLength={32} onChangeText={value => change('unit', value)} />
    </View></View>
    {editor.detectedPrice !== null && <Text style={r.caption}>Receipt amount: {editor.detectedPrice} · {editor.currency === 'INR' ? 'INR' : editor.currency === 'unsupported' ? 'foreign currency; enter an INR value only if known' : 'currency not stated — confirm before saving'}</Text>}
    <FormInput label="Purchase value (₹, optional)" accessibilityLabel="Purchase value" value={editor.draft.price} keyboardType="decimal-pad" onChangeText={value => change('price', value)} />
    <Text style={r.caption}>Value is for this whole entry. Leave blank if unknown.</Text>
    <Text style={r.sectionTitle}>Expiry date</Text>
    {!!expiry.packageDate && <Text style={ui.label}>Confirmed printed expiry: {expiry.packageDate}</Text>}
    {!!expiry.days && <Text style={ui.label}>Estimated from {expiry.baseDate} · {expiry.days} days</Text>}
    <FormInput label="Manual expiry (YYYY-MM-DD)" accessibilityLabel="Manual expiry" value={expiry.userDate} maxLength={10}
      onChangeText={value => { setExpiry({ packageDate: '', userDate: value, baseDate: '', days: '' }); setError(''); }} />
    {receiptProductKind(editor) === 'fresh' && automaticFreshRule(editor.draft.name) && <PrimaryButton label="Use Fresh-Food Estimate" variant="ghost" onPress={() => {
      const rule = automaticFreshRule(editor.draft.name)!;
      setExpiry({ packageDate: '', userDate: '', baseDate: purchaseDate, days: String(rule.rangeDays[0]) }); setError('');
    }} />}
    <Text style={ui.text}>{receiptProductKind(editor) === 'fresh'
      ? 'Fresh products do not need an expiry-tag scan. Use the supported estimate or enter your own tracking date.'
      : 'A manually entered date is your tracking choice. For a printed package date, save these details and use Scan Expiry Tag on its product card.'}</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    <PrimaryButton label="Save Product" onPress={() => {
      try {
        const kind = receiptProductKind(editor), rule = kind === 'fresh' ? automaticFreshRule(editor.draft.name) : null;
        const chosen = !expiry.packageDate && !expiry.userDate && !expiry.days && rule
          ? { packageDate: '', userDate: '', baseDate: purchaseDate, days: String(rule.rangeDays[0]) } : expiry;
        // Save an incomplete product too, so scanning its label can complete it next.
        if (!chosen.packageDate && !chosen.userDate && !chosen.days) {
          if (editor.draft.name.trim().length < 2) throw Error('Enter a product name.');
          update({ ...editor, reviewed: false, draft: { ...editor.draft, expiresOn: '' }, expirySelection: undefined, packageDateReview: { kind: 'unchecked' } });
        } else {
          const review = chosen.packageDate ? confirmPrintedReceiptDate(editor.draft.name, chosen.packageDate) : { kind: kind === 'fresh' ? 'not-applicable' as const : 'unavailable' as const };
          const saved = saveReceiptCandidate({ ...editor, packageDateReview: review }, chosen);
          update({ ...saved, selected: editor.selected });
        }
        setEditor(null);
      } catch (problem) { setError((problem as Error).message); }
    }} />
    <PrimaryButton label="Cancel Edit" variant="ghost" onPress={() => { setEditor(null); setError(''); }} />
  </View>;
  return <View style={{ gap: 16 }}>
    <View style={r.card}>
      <ReviewHeading title="Your grocery haul" subtitle="Check the products. Edit only what needs changing." />
      <ReviewStats stats={[{ label: 'Detected', value: rows.length }, { label: 'Ready', value: included.length - pending.length }, { label: 'Needs review', value: pending.length, warning: pending.length > 0 }]} />
      <View style={r.compactRow}><Text style={r.caption}>Purchased {purchaseDate}</Text>
      <ReviewAction label={changingDate ? 'Cancel Date Change' : 'Change Purchase Date'} text={changingDate ? 'Cancel' : 'Change'} icon="calendar-edit" onPress={() => { setDateInput(purchaseDate); setChangingDate(value => !value); setError(''); }} /></View>
      {changingDate && <>
        <FormInput label="Purchase date (YYYY-MM-DD)" accessibilityLabel="Purchase date" value={dateInput} maxLength={10} onChangeText={setDateInput} />
        <PrimaryButton label="Update Fresh-Food Estimates" onPress={() => {
          try {
            resolveExpiry({ packageDate: dateInput, userDate: null, preset: null });
            if (dateInput > kolkataToday()) throw Error('Purchase date cannot be in the future.');
            setRows(previous => previous.map(row => {
              const rule = automaticFreshRule(row.draft.name);
              if (!rule || modified.current.has(row.id) || !row.expirySelection?.preset) return row;
              const saved = saveReceiptCandidate(row, { packageDate: '', userDate: '', baseDate: dateInput, days: String(rule.rangeDays[0]) });
              return { ...saved, selected: row.selected };
            }));
            setPurchaseDate(dateInput); setChangingDate(false); setError('');
          } catch (problem) { setError((problem as Error).message); }
        }} />
      </>}
      <ReviewDisclosure title="Review tips & estimate guidance">
      <Text style={ui.text}>Fresh-food dates are editable storage estimates starting on the purchase date, not production dates or safety guarantees. Their storage conditions are shown on each card. Printed dates take priority.</Text>
      <Text style={ui.text}>No price conversion is performed. Foreign-currency values stay unknown; other displayed values are in ₹ and need checking.</Text>
      <Text style={ui.text}>If quantity is unclear, 1 piece is prefilled. Change the quantity and unit where needed.</Text>
      </ReviewDisclosure>
    </View>
    {!!packaged.length && <View style={r.info}>
      <View style={r.compactRow}><View style={{ flex: 1 }}><Text style={r.sectionTitle}>{packaged.length} packaged {packaged.length === 1 ? 'date' : 'dates'} to check</Text><Text style={r.caption}>Scan any item’s expiry tag, or edit its date.</Text></View>
      <ReviewAction label={showPackaged ? 'Hide packaged queue' : 'Choose packaged item'} text={showPackaged ? 'Hide queue' : 'Choose item'} icon="camera-outline" onPress={() => setShowPackaged(value => !value)} /></View>
      {showPackaged && <>
      <Text style={ui.heading}>Check packaged expiry dates</Text>
      <Text style={ui.text}>Photograph the expiry stamp on each packaged product. If it cannot be read, edit the product to enter a date yourself, or exclude it for now.</Text>
      <Text style={ui.text}>Choose any packaged item below; you do not have to scan them in order.</Text>
      {packaged.slice(currentPackagePage * 10, (currentPackagePage + 1) * 10).map(({ row }) => <PrimaryButton key={row.id} label={`Scan Expiry · ${row.draft.name}`} onPress={() => setLabelItem(row)} />)}
      {packagePages > 1 && <>
        <Text style={ui.text}>Packaged items · page {currentPackagePage + 1} of {packagePages}</Text>
        <PrimaryButton label="Previous Packaged Items" variant="ghost" disabled={currentPackagePage === 0} onPress={() => setPackagePage(currentPackagePage - 1)} />
        <PrimaryButton label="Next Packaged Items" variant="ghost" disabled={currentPackagePage === packagePages - 1} onPress={() => setPackagePage(currentPackagePage + 1)} />
      </>}
      </>}
    </View>}
    {(fresh.length > 0 || other.length > 0) && <View style={r.info}><Text style={r.warning}>{fresh.length + other.length} products need a date or correction</Text><Text style={r.caption}>Edit the highlighted cards or exclude them. Fresh products do not need a package scan.</Text></View>}
    {pages > 1 && <View style={ui.card}>
      <Text style={ui.label}>Products {currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, rows.length)} of {rows.length}</Text>
      <View style={ui.row}>
        <PrimaryButton label="Previous" variant="ghost" disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} />
        <PrimaryButton label="Next" variant="ghost" disabled={currentPage === pages - 1} onPress={() => setPage(currentPage + 1)} />
      </View>
    </View>}
    {!rows.length && <Text accessibilityRole="alert" style={ui.text}>No products recognized. Retake a clearer receipt photo, upload another image, or add missing products below.</Text>}
    {rows.slice(currentPage * 10, (currentPage + 1) * 10).map(row => {
      const rule = row.expirySelection?.preset ? automaticFreshRule(row.draft.name) : null;
      const kind = receiptProductKind(row), problem = pending.find(item => item.row.id === row.id);
      return <ReceiptProductCard key={row.id} row={row} kind={kind} rule={rule} issue={problem?.issue}
        onToggle={() => setRows(previous => previous.map(item => item.id === row.id ? { ...item, selected: !item.selected } : item))}
        onEdit={() => edit(row)} onRemove={() => setRows(previous => previous.filter(item => item.id !== row.id))}
        onScan={() => setLabelItem(row)} onGuidance={() => { if (rule) void Linking.openURL(rule.sourceUrl).catch(() => {}); }} />;
    })}
    <PrimaryButton label="＋ Add Missing Product" variant="ghost" disabled={rows.length >= RECEIPT_MAX_ITEMS} onPress={() => edit({ ...manualReceiptCandidate(`manual-${++next.current}`), selected: true, draft: { name: '', category: 'Other', quantity: '1', unit: 'piece', price: '', expiresOn: '' } })} />
    <Text style={ui.text}>Compare the list with your receipt: unclear products or split columns may be missed. Nothing is saved until the final confirmation.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    {readOnly && <Text accessibilityRole="alert" style={ui.text}>Pantry is read-only. Refresh it online before adding groceries.</Text>}
    {!included.length && !!rows.length && <Text style={ui.text}>Include at least one product to add it to Pantry.</Text>}
    <PrimaryButton label={`Review & Add ${included.length} Products to Pantry`} disabled={readOnly || !included.length || changingDate} onPress={() => {
      if (pending.length) {
        const first = pending[0]!;
        setPage(Math.floor(rows.findIndex(row => row.id === first.row.id) / 10));
        setError(`${pending.length} product${pending.length === 1 ? '' : 's'} still need attention. ${first.row.draft.name}: ${first.issue} Edit, scan packaged items, or exclude them before continuing.`);
        return;
      }
      try { onPrepare(reviewedReceiptInput(rows)); }
      catch (problem) { setError((problem as Error).message); }
    }} />
    {!!pending.length && <Text style={ui.text}>Finish {pending.length} {pending.length === 1 ? 'product that needs' : 'products that need'} a date or details, or exclude {pending.length === 1 ? 'it' : 'them'} to continue.</Text>}
  </View>;
}
