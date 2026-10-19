import React from 'react';
import { Text, View } from 'react-native';
import FormInput from './FormInput';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';
import { Colors } from '../constants/Theme';
import type { PantryCategory } from '../types/api';
import { expiryPreset, resolveExpiry, expirySelection, kolkataToday, type ExpiryDraft } from '../lib/pantryExpiry';

/** Shared real-household form; supplied designs have no separate add/edit reference. */
export default function PantryExpiryFields({ value, onChange, name, category, disabled = false, useLegacyPresets = true }: {
  value: ExpiryDraft; onChange: (value: ExpiryDraft) => void; name: string; category: PantryCategory; disabled?: boolean; useLegacyPresets?: boolean;
}) {
  const preset = expiryPreset(name, category);
  let summary: string;
  let invalid = false;
  try {
    const resolved = resolveExpiry(expirySelection(value));
    summary = `${resolved.expirySource === 'PACKAGE_DATE' ? 'Package date' : resolved.expirySource === 'USER_ENTERED' ? 'User set' : 'Estimated'}: ${resolved.expiresOn}`;
  } catch (error) { summary = (error as Error).message; invalid = true; }
  const change = (key: keyof ExpiryDraft, text: string) => onChange({ ...value, [key]: text });
  return <View>
    <Text style={ui.heading}>Expiry</Text>
    <FormInput label="Package date (optional, YYYY-MM-DD)" accessibilityLabel="Package date" value={value.packageDate}
      editable={!disabled} maxLength={10} autoCapitalize="none" placeholder="YYYY-MM-DD" onChangeText={text => change('packageDate', text)} />
    <FormInput label="Manual expiry date (optional, YYYY-MM-DD)" accessibilityLabel="Manual expiry date" value={value.userDate}
      editable={!disabled} maxLength={10} autoCapitalize="none" placeholder="YYYY-MM-DD" onChangeText={text => change('userDate', text)} />
    {useLegacyPresets && <PrimaryButton label={preset ? `Use Shelf-life Estimate (${preset.days} days)` : 'Set Custom Shelf-life Estimate'} variant="ghost" disabled={disabled}
      onPress={() => onChange({ ...value, baseDate: value.baseDate || kolkataToday(), days: String(preset?.days ?? 7) })} />}
    {!useLegacyPresets && <PrimaryButton label="Set Custom Shelf-life Estimate" variant="ghost" disabled={disabled}
      onPress={() => onChange({ ...value, baseDate: value.baseDate || kolkataToday(), days: value.days })} />}
    {!!(value.days || value.baseDate) && <>
      <FormInput label="Estimate starting date (YYYY-MM-DD)" accessibilityLabel="Estimate starting date" value={value.baseDate}
        editable={!disabled} maxLength={10} autoCapitalize="none" onChangeText={text => change('baseDate', text)} />
      <FormInput label="Shelf life (1–365 days)" accessibilityLabel="Shelf life in days" value={value.days} keyboardType="number-pad"
        editable={!disabled} maxLength={3} onChangeText={text => change('days', text)} />
      <PrimaryButton label="Remove Estimate" variant="ghost" disabled={disabled} onPress={() => onChange({ ...value, baseDate: '', days: '' })} />
    </>}
    <Text style={[ui.text, invalid && { color: Colors.error }]} accessibilityLiveRegion="polite">{summary}</Text>
    <Text style={ui.text}>Package date takes priority, then manual date, then estimate. Clear a higher-priority date to use an estimate. Only the chosen expiry is saved. Estimates are editable tracking assumptions, not food-safety guarantees. Dates use Asia/Kolkata.</Text>
  </View>;
}
