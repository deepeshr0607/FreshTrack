import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { nativeReminderPreferences } from '@/features/notifications/nativePreferences';
import PrimaryButton from './PrimaryButton';
import FormInput from './FormInput';
import { ui } from './PrototypeScreen';

/** Uses the existing Settings card/form styles; no separate Settings design was supplied. */
export default function ReminderPreferencesCard({ userId }: { userId: string }) {
  const { session, state: authState } = useAuth();
  const model = useMemo(() => nativeReminderPreferences(JSON.stringify([process.env.EXPO_PUBLIC_NEON_AUTH_URL, userId]), () => {
    const state = session.getSnapshot(); return !state.checking && state.user?.id === userId;
  }), [session, userId]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const [hour, setHour] = useState(state.hour);
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => { setHour(state.hour); }, [state.hour]);
  useEffect(() => {
    void model.refresh();
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void model.refresh(); });
    return () => { subscription.remove(); };
  }, [model, authState.checking]);
  const enabled = state.enabled && state.permission.allowed;
  return <View style={ui.card}>
    <Text style={ui.heading}>Expiry Reminders</Text>
    <Text style={ui.text}>Allow notifications to receive reminders before groceries expire. You can turn reminders off at any time.</Text>
    <Text style={ui.label} accessibilityLiveRegion="polite">Device permission: {state.permission.label}</Text>
    <Text style={ui.label}>Reminder preference: {enabled ? 'On' : 'Off'}</Text>
    {state.enabled && !state.permission.allowed && <Text style={ui.text}>Your saved preference is On, but device permission currently blocks reminders.</Text>}
    <PrimaryButton label={enabled ? 'Disable Reminders' : 'Enable Reminders'} loading={state.busy} disabled={!state.ready}
      onPress={() => void (enabled ? model.disable() : model.enable())} />
    {state.enabled && !state.permission.allowed && <PrimaryButton label="Turn Saved Preference Off" variant="ghost" disabled={state.busy}
      onPress={() => void model.disable()} />}
    {state.ready && !state.permission.allowed && !state.permission.canAskAgain && <PrimaryButton label="Open Device Settings" variant="ghost"
      onPress={() => { setSettingsError(''); void Linking.openSettings().catch(() => setSettingsError('Unable to open device settings. Open them manually, then return.')); }} />}
    <FormInput label="Reminder time (HH:MM)" accessibilityLabel="Expiry reminder time" value={hour} onChangeText={setHour} editable={state.ready && !state.busy} />
    <PrimaryButton label="Save Reminder Time" variant="ghost" disabled={!state.ready || state.busy} onPress={() => void model.saveHour(hour)} />
    <PrimaryButton label="Refresh Permission Status" variant="ghost" loading={state.busy} onPress={() => void model.refresh()} />
    {!!(state.message || settingsError) && <Text style={ui.label} accessibilityLiveRegion="polite">{settingsError || state.message}</Text>}
    <Text style={ui.text}>Saved for this account on this device. No expiry alerts are scheduled yet. Scheduling will use device-local time; household expiry dates remain Asia/Kolkata.</Text>
  </View>;
}
