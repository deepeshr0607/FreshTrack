import React from 'react';
import { Text, View } from 'react-native';
import CalendarDateField from './CalendarDateField';
import FormInput from './FormInput';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';
import { Colors } from '../constants/Theme';
import type { PantryCategory } from '../types/api';
import { expiryPreset, resolveExpiry, expirySelection, kolkataToday, expiryDateValue, chooseExpiryDate, type ExpiryDraft } from '../lib/pantryExpiry';

/** Shared real-household form; supplied designs have no separate add/edit reference. */
export default function PantryExpiryFields({ value, onChange, name, category, disabled = false, useLegacyPresets = true, packageDateConfirmed, simple = false }: {
  value: ExpiryDraft; onChange: (value: ExpiryDraft) => void; name: string; category: PantryCategory; disabled?: boolean; useLegacyPresets?: boolean; packageDateConfirmed?: boolean; simple?: boolean;
}) {
  const preset = expiryPreset(name, category);
  let summary: string;
  let invalid = false;
  try {
    const resolved = resolveExpiry(expirySelection(value));
    summary = `${resolved.expirySource === 'PACKAGE_DATE' ? packageDateConfirmed === false ? 'Package date (awaiting confirmation)' : 'Package date' : resolved.expirySource === 'USER_ENTERED' ? 'User set' : 'Estimated'}: ${resolved.expiresOn}`;
  } catch (error) { summary = (error as Error).message; invalid = true; }
  const change = (key: keyof ExpiryDraft, text: string) => onChange({ ...value, [key]: text });
  if (simple) return <View style={{ gap: 8 }}>
    <CalendarDateField value={expiryDateValue(value)} disabled={disabled} onChange={date => onChange(chooseExpiryDate(value, date))} />
    {!!expiryDateValue(value) && <Text style={ui.label}>{summary}</Text>}
    <PrimaryButton label={preset ? `Use Shelf-life Estimate (${preset.days} days)` : 'Set Custom Shelf-life Estimate'} variant="ghost" disabled={disabled}
      onPress={() => onChange({ packageDate: '', userDate: '', baseDate: value.baseDate || kolkataToday(), days: String(preset?.days ?? 7) })} />
    {!!(value.days || value.baseDate) && <>
      <CalendarDateField label="Estimate starting date" value={value.baseDate} disabled={disabled} onChange={date => change('baseDate', date)} />
      <FormInput label="Shelf life (1–365 days)" accessibilityLabel="Shelf life in days" value={value.days} keyboardType="number-pad" editable={!disabled} maxLength={3} onChangeText={text => change('days', text)} />
      {invalid && <Text style={[ui.text, { color: Colors.error }]} accessibilityRole="alert">{summary}</Text>}
    </>}
    <Text style={ui.text}>An estimate fills the expiry date. Choose a different date to replace it, or choose a date when the field is blank. Estimates are tracking assumptions, not food-safety guarantees.</Text>
  </View>;
  return <View>
    <Text style={ui.heading}>Expiry</Text>
    <CalendarDateField label="Package date" value={value.packageDate} disabled={disabled} onChange={text => change('packageDate', text)} />
    <CalendarDateField label="Expiry date" value={value.userDate} disabled={disabled} onChange={text => change('userDate', text)} />
    {useLegacyPresets && <PrimaryButton label={preset ? `Use Shelf-life Estimate (${preset.days} days)` : 'Set Custom Shelf-life Estimate'} variant="ghost" disabled={disabled}
      onPress={() => onChange({ ...value, baseDate: value.baseDate || kolkataToday(), days: String(preset?.days ?? 7) })} />}
    {!useLegacyPresets && <PrimaryButton label="Set Custom Shelf-life Estimate" variant="ghost" disabled={disabled}
      onPress={() => onChange({ ...value, baseDate: value.baseDate || kolkataToday(), days: value.days })} />}
    {!!(value.days || value.baseDate) && <>
      <CalendarDateField label="Estimate starting date" value={value.baseDate} disabled={disabled} onChange={text => change('baseDate', text)} />
      <FormInput label="Shelf life (1–365 days)" accessibilityLabel="Shelf life in days" value={value.days} keyboardType="number-pad"
        editable={!disabled} maxLength={3} onChangeText={text => change('days', text)} />
      <PrimaryButton label="Remove Estimate" variant="ghost" disabled={disabled} onPress={() => onChange({ ...value, baseDate: '', days: '' })} />
    </>}
    <Text style={[ui.text, invalid && { color: Colors.error }]} accessibilityLiveRegion="polite">{summary}</Text>
    <Text style={ui.text}>Package date takes priority, then manual date, then estimate. Clear a higher-priority date to use an estimate. Only the chosen expiry is saved. Estimates are editable tracking assumptions, not food-safety guarantees. Dates use Asia/Kolkata.</Text>
  </View>;
}
