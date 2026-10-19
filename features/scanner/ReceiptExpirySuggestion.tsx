import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import { kolkataToday, type ExpiryDraft } from '@/lib/pantryExpiry';
import { receiptStorageRules, receiptStorageNotice, applyReceiptStorageRule } from '@/lib/receiptShelfLife';

/** Storage confirmation is local to this edit; only accepted date/base/days are saved. */
export default function ReceiptExpirySuggestion({ name, value, onChange, confirmedPurchaseDate = '' }: {
  name: string; value: ExpiryDraft; onChange(value: ExpiryDraft): void; confirmedPurchaseDate?: string;
}) {
  const [purchaseDate, setPurchaseDate] = useState(confirmedPurchaseDate);
  const [error, setError] = useState('');
  const rules = receiptStorageRules(name);
  const notice = receiptStorageNotice(name);
  if (!rules.length) return <View>
    {!!notice && <Text style={ui.text}>{notice}</Text>}
    <Text style={ui.text}>No researched storage estimate for this item yet. Check its printed date or enter a date yourself. Fresh, frozen, cooked and packaged foods need different guidance.</Text>
  </View>;
  const blocked = !!(value.packageDate || value.userDate);
  return <View style={ui.card}>
    <Text style={ui.heading}>Food storage estimate</Text>
    {!!notice && <Text style={ui.text}>{notice}</Text>}
    <Text style={ui.text}>Confirm the food and condition below, then enter the actual purchase date. Buying it does not prove when it was produced or how it was stored. Use a shorter date for older food and follow any earlier package instructions.</Text>
    <FormInput label="Purchase date to confirm (YYYY-MM-DD)" accessibilityLabel="Confirmed purchase date" value={purchaseDate}
      maxLength={10} autoCapitalize="none" placeholder="YYYY-MM-DD" onChangeText={text => { setPurchaseDate(text); setError(''); }} />
    {rules.map(rule => <View key={rule.id}>
      <Text style={ui.text}>{rule.condition}. {rule.guidance ?? `Guidance: ${rule.rangeDays[0]}–${rule.rangeDays[1]} days. Suggested tracking duration: ${rule.rangeDays[0]} days.`}</Text>
      <PrimaryButton label="View Storage Guidance" variant="ghost" onPress={() => {
        void Linking.openURL(rule.sourceUrl).catch(() => setError('Unable to open storage guidance. Try again.'));
      }} />
      <Text style={ui.text}>Source: {rule.source}. The lower end of the range is used; this does not guarantee safety.</Text>
      <PrimaryButton label={rule.confirmationLabel ?? 'Confirm Condition & Use Estimate'} variant="ghost" disabled={blocked} onPress={() => {
        try { onChange(applyReceiptStorageRule(name, rule.id, purchaseDate, kolkataToday(), value)); setError(''); }
        catch (problem) { setError((problem as Error).message); }
      }} />
    </View>)}
    {blocked && <Text style={ui.text}>Your package or manual date has priority. Clear it only if you intend to use an estimate.</Text>}
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
  </View>;
}
