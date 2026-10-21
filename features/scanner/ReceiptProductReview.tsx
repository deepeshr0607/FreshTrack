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
import { manualReceiptCandidate, receiptExpiryDraft, receiptExpiryLabel, saveReceiptCandidate, type LocalReceiptCandidate } from '@/lib/receiptCandidates';
import { receiptProducts, automaticFreshRule } from '@/lib/receiptProducts';
import { reviewedReceiptInput } from '@/lib/receiptImport';
import { confirmPrintedReceiptDate } from '@/lib/receiptPackageDates';
import { RECEIPT_MAX_ITEMS } from '@/lib/receiptLimits';
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
  const included = rows.filter(row => row.selected), pending = included.filter(row => !row.reviewed);
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
    setEditor(previous => previous ? { ...previous, draft: { ...previous.draft, [key]: value } } : null);
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
  if (editor) return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Edit product</Text>
    <FormInput label="Product name" value={editor.draft.name} maxLength={120} onChangeText={value => change('name', value)} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{PANTRY_CATEGORIES.map(category => <Pressable key={category.name}
      accessibilityRole="radio" accessibilityLabel={category.name} accessibilityState={{ checked: editor.draft.category === category.name }}
      style={[ui.pill, editor.draft.category === category.name && { backgroundColor: Colors.primary }]}
      onPress={() => change('category', category.name)}><Text style={[ui.label, editor.draft.category === category.name && { color: Colors.white }]}>{category.emoji} {category.name}</Text></Pressable>)}</View>
    <FormInput label="Quantity" value={editor.draft.quantity} keyboardType="decimal-pad" onChangeText={value => change('quantity', value)} />
    <FormInput label="Unit (piece, pack, kg, l…)" value={editor.draft.unit} maxLength={32} onChangeText={value => change('unit', value)} />
    <FormInput label="Total product value (₹, optional)" value={editor.draft.price} keyboardType="decimal-pad" onChangeText={value => change('price', value)} />
    <Text style={ui.text}>Blank value means unknown. Quantity defaults to 1 piece when it is not readable; correct it here.</Text>
    {!!expiry.packageDate && <Text style={ui.label}>Confirmed printed expiry: {expiry.packageDate}</Text>}
    {!!expiry.days && <Text style={ui.label}>Estimated from {expiry.baseDate} · {expiry.days} days</Text>}
    <FormInput label="Change expiry / enter manually (YYYY-MM-DD)" value={expiry.userDate} maxLength={10}
      onChangeText={value => { setExpiry({ packageDate: '', userDate: value, baseDate: '', days: '' }); setError(''); }} />
    {automaticFreshRule(editor.draft.name) && <PrimaryButton label="Use Fresh-Food Estimate" variant="ghost" onPress={() => {
      const rule = automaticFreshRule(editor.draft.name)!;
      setExpiry({ packageDate: '', userDate: '', baseDate: purchaseDate, days: String(rule.rangeDays[0]) }); setError('');
    }} />}
    <Text style={ui.text}>A manually entered date is your tracking choice. For a printed package date, save these details and use Scan Expiry Tag on its product card.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    <PrimaryButton label="Save Product" onPress={() => {
      try {
        // Save an incomplete product too, so scanning its label can complete it next.
        if (!expiry.packageDate && !expiry.userDate && !expiry.days) {
          if (editor.draft.name.trim().length < 2) throw Error('Enter a product name.');
          update({ ...editor, reviewed: false, draft: { ...editor.draft, expiresOn: '' }, expirySelection: undefined, packageDateReview: { kind: 'unchecked' } });
        } else {
          const review = expiry.packageDate ? confirmPrintedReceiptDate(editor.draft.name, expiry.packageDate) : { kind: 'unavailable' as const };
          const saved = saveReceiptCandidate({ ...editor, packageDateReview: review }, expiry);
          update({ ...saved, selected: editor.selected });
        }
        setEditor(null);
      } catch (problem) { setError((problem as Error).message); }
    }} />
    <PrimaryButton label="Cancel Edit" variant="ghost" onPress={() => { setEditor(null); setError(''); }} />
  </View>;
  return <View style={{ gap: 16 }}>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.title}>Haul Detected</Text>
      <Text style={ui.text}>{rows.length} products · {included.length - pending.length} ready · {pending.length} need details or a date</Text>
      <Text style={ui.text}>Check your products below. Edit only what needs changing, then add the reviewed haul together.</Text>
      <Text style={ui.label}>Purchase date: {purchaseDate}</Text>
      <PrimaryButton label={changingDate ? 'Cancel Date Change' : 'Change Purchase Date'} variant="ghost" onPress={() => { setDateInput(purchaseDate); setChangingDate(value => !value); setError(''); }} />
      {changingDate && <>
        <FormInput label="Purchase date (YYYY-MM-DD)" value={dateInput} maxLength={10} onChangeText={setDateInput} />
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
      <Text style={ui.text}>Fresh-food dates are editable storage estimates starting on the purchase date, not production dates or safety guarantees. Their storage conditions are shown on each card. Printed dates take priority.</Text>
      <Text style={ui.text}>No price conversion is performed. Foreign-currency values stay unknown; other displayed values are in ₹ and need checking.</Text>
      <Text style={ui.text}>If quantity is unclear, 1 piece is prefilled. Change the quantity and unit where needed.</Text>
    </View>
    {!!pending.length && <View style={[ui.card, { backgroundColor: Colors.surfaceContainerLow }]}>
      <Text style={ui.heading}>Check packaged expiry dates</Text>
      <Text style={ui.text}>Photograph the expiry stamp on each packaged product. If it cannot be read, edit the product to enter a date yourself, or exclude it for now.</Text>
      <PrimaryButton label={`Scan Next Expiry · ${pending[0]!.draft.name}`} onPress={() => setLabelItem(pending[0]!)} />
    </View>}
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
      return <View key={row.id} style={[ui.card, { backgroundColor: Colors.surfaceContainerLow, opacity: row.selected ? 1 : 0.65 }]}>
        <View style={ui.row}><Text style={[ui.heading, { flex: 1 }]}>{row.draft.name}</Text>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${row.draft.name}`} accessibilityState={{ checked: row.selected }}
            style={ui.pill} onPress={() => setRows(previous => previous.map(item => item.id === row.id ? { ...item, selected: !item.selected } : item))}>
            <Text style={ui.label}>{row.selected ? '✓ Include' : 'Excluded'}</Text></Pressable></View>
        <Text style={ui.text}>{row.draft.category} · {row.draft.quantity} {row.draft.unit} · {row.draft.price ? `₹${row.draft.price}` : 'Unknown value'}</Text>
        {(row.sourceLineIds?.length ?? 0) > 1 && <Text style={ui.text}>Matched receipt columns · check the product and amount.</Text>}
        <Text style={ui.label}>{row.reviewed ? receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection }) : 'Needs an expiry date / details'}</Text>
        {rule && <>
          <Text style={ui.text}>{rule.condition}. Shorten the date if the food is older or stored differently.</Text>
          <Pressable accessibilityRole="link" style={ui.pill} onPress={() => void Linking.openURL(rule.sourceUrl).catch(() => {})}><Text style={ui.label}>Storage guidance · {rule.source}</Text></Pressable>
        </>}
        <PrimaryButton label="Edit Product" accessibilityLabel={`Edit ${row.draft.name}`} variant="ghost" onPress={() => edit(row)} />
        <PrimaryButton label={row.expirySelection?.packageDate ? 'Rescan Expiry Tag' : 'Scan Expiry Tag'} accessibilityLabel={`Scan expiry for ${row.draft.name}`} variant="ghost" onPress={() => setLabelItem(row)} />
        <PrimaryButton label="Remove Product" accessibilityLabel={`Remove ${row.draft.name}`} variant="ghost" onPress={() => setRows(previous => previous.filter(item => item.id !== row.id))} />
      </View>;
    })}
    <PrimaryButton label="＋ Add Missing Product" variant="ghost" disabled={rows.length >= RECEIPT_MAX_ITEMS} onPress={() => edit({ ...manualReceiptCandidate(`manual-${++next.current}`), selected: true, draft: { name: '', category: 'Other', quantity: '1', unit: 'piece', price: '', expiresOn: '' } })} />
    <Text style={ui.text}>Compare the list with your receipt: unclear products or split columns may be missed. Nothing is saved until the final confirmation.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
    {readOnly && <Text accessibilityRole="alert" style={ui.text}>Pantry is read-only. Refresh it online before adding groceries.</Text>}
    <PrimaryButton label={`Review & Add ${included.length} Products to Pantry`} disabled={readOnly || !included.length || !!pending.length || changingDate} onPress={() => {
      try { onPrepare(reviewedReceiptInput(rows)); }
      catch (problem) { setError((problem as Error).message); }
    }} />
    {!!pending.length && <Text style={ui.text}>Finish the {pending.length} included products that need a date or details, or exclude them to continue.</Text>}
  </View>;
}
