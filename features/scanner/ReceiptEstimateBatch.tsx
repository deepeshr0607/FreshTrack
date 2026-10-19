import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import { kolkataToday } from '@/lib/pantryExpiry';
import { receiptEstimateOptions, confirmReceiptPurchaseDate, prepareReceiptEstimateBatch, type ReceiptEstimatePlan } from '@/lib/receiptBatchEstimates';
import type { LocalReceiptCandidate } from '@/lib/receiptCandidates';

export default function ReceiptEstimateBatch({ rows, confirmedDate, onConfirmDate, onApply }: {
  rows: LocalReceiptCandidate[]; confirmedDate: string; onConfirmDate(date: string): void; onApply(plan: ReceiptEstimatePlan): void;
}) {
  const [input, setInput] = useState(confirmedDate);
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ReceiptEstimatePlan | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pageCount = Math.max(1, Math.ceil(rows.length / 10));
  const page = Math.min(pageIndex, pageCount - 1);
  const eligible = rows.filter(row => receiptEstimateOptions(row).length).length;
  const reset = () => { setPreview(null); setChoices({}); setOpen(false); setError(''); setPageIndex(0); };
  return <View style={ui.card}>
    <Text style={ui.heading}>Receipt purchase date</Text>
    <Text style={ui.text}>Confirm once for this receipt. This is when you bought the groceries, not their production date. Existing reviewed dates and estimates are preserved when this date changes.</Text>
    <FormInput label="Receipt purchase date (YYYY-MM-DD)" accessibilityLabel="Receipt purchase date" value={input}
      maxLength={10} autoCapitalize="none" placeholder="YYYY-MM-DD" onChangeText={text => {
        setInput(text); onConfirmDate(''); reset(); setMessage('');
      }} />
    <PrimaryButton label="Confirm Receipt Purchase Date" variant="ghost" onPress={() => {
      try { const date = confirmReceiptPurchaseDate(input, kolkataToday()); onConfirmDate(date); reset(); setMessage('Purchase date confirmed for this receipt.'); }
      catch (problem) { setError((problem as Error).message); }
    }} />
    {!!confirmedDate && <Text style={ui.text}>Confirmed purchase date: {confirmedDate}. Individual grocery forms use this date as a starting point; you can change it for an item.</Text>}
    {!open && <PrimaryButton label="Review Suggested Dates Together" variant="ghost" disabled={!confirmedDate || !eligible} onPress={() => {
      setOpen(true); setError(''); setMessage('');
    }} />}
    <Text style={ui.text}>{eligible} eligible for new estimates · {rows.length - eligible} need individual review or already have a date. Every item still needs quantity, category and field review before import.</Text>
    {open && !preview && <>
      <Text style={ui.heading}>Confirm storage for each grocery</Text>
      <Text style={ui.text}>Choose only conditions you checked. A suggested food name does not prove storage or freshness. Nothing is selected automatically. Estimates remain editable tracking assumptions; follow earlier printed instructions.</Text>
      <Text style={ui.text}>Condition page {page + 1} of {pageCount}</Text>
      {rows.slice(page * 10, (page + 1) * 10).map(row => {
        const options = receiptEstimateOptions(row);
        return <View key={row.id} style={ui.card}>
          <Text style={ui.heading}>{row.draft.name || 'Unnamed grocery'}</Text>
          {!options.length && <Text style={ui.text}>{row.reviewed || row.draft.expiresOn || row.expirySelection ? 'Existing review/date preserved.' : 'No supported condition. Review this item separately.'}</Text>}
          {options.map(rule => <Pressable key={rule.id} accessibilityRole="checkbox"
            accessibilityLabel={`${row.draft.name}: ${rule.condition}`} accessibilityState={{ checked: choices[row.id] === rule.id }}
            style={[ui.pill, choices[row.id] === rule.id && { borderWidth: 1, borderColor: Colors.primary }]}
            onPress={() => { setChoices(previous => ({ ...previous, [row.id]: previous[row.id] === rule.id ? '' : rule.id })); setError(''); }}>
            <Text style={ui.label}>{choices[row.id] === rule.id ? '✓ ' : ''}{rule.condition}</Text>
            <Text style={ui.text}>{rule.guidance ?? `Suggested duration: ${rule.rangeDays[0]} days.`} Source: {rule.source}.</Text>
          </Pressable>)}
        </View>;
      })}
      {pageCount > 1 && <>
        <PrimaryButton label="Previous Conditions" variant="ghost" disabled={!page} onPress={() => setPageIndex(page - 1)} />
        <PrimaryButton label="Next Conditions" variant="ghost" disabled={page + 1 === pageCount} onPress={() => setPageIndex(page + 1)} />
      </>}
      <PrimaryButton label="Preview Chosen Estimates" onPress={() => {
        try { setPreview(prepareReceiptEstimateBatch(rows, confirmedDate, kolkataToday(), choices)); setError(''); }
        catch (problem) { setError((problem as Error).message); }
      }} />
    </>}
    {open && preview && <>
      <Text style={ui.heading}>Suggested dates · {preview.estimates.length} groceries</Text>
      <Text style={ui.text}>Purchase date: {preview.purchaseDate}. Confirming prefills only these dates locally. It does not approve fields, select groceries for import, or save to Pantry.</Text>
      {preview.estimates.map(estimate => <Text key={estimate.rowId} style={ui.text}>{estimate.name} · Estimated: {estimate.expiresOn} · {estimate.days} days</Text>)}
      <PrimaryButton label="Apply Chosen Estimates" onPress={() => {
        try { onApply(preview); reset(); setMessage('Estimates filled locally. Review and save each grocery before importing.'); }
        catch (problem) { setError((problem as Error).message); }
      }} />
      <PrimaryButton label="Back to Conditions" variant="ghost" onPress={() => { setPreview(null); setError(''); }} />
    </>}
    {open && <PrimaryButton label="Cancel Suggested Dates" variant="ghost" onPress={reset} />}
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.text}>{message}</Text>}
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
  </View>;
}
