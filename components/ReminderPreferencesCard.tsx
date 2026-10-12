import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Linking, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { nativeReminderPreferences } from '@/features/notifications/nativePreferences';
import { nativeExpiryScheduler, notificationScope } from '@/features/notifications/nativeScheduler';
import { useRealPantry } from '@/context/RealPantryContext';
import useAuthRequest from '@/features/auth/useAuthRequest';
import PrimaryButton from './PrimaryButton';
import FormInput from './FormInput';
import { ui } from './PrototypeScreen';

/** Uses the existing Settings card/form styles; no separate Settings design was supplied. */
export default function ReminderPreferencesCard({ userId }: { userId: string }) {
  const { session } = useAuth();
  const pantry = useRealPantry();
  const scheduler = nativeExpiryScheduler!; // Parent only renders this card on native.
  const schedule = useSyncExternalStore(scheduler.subscribe, scheduler.getSnapshot, scheduler.getSnapshot);
  const scope = notificationScope(userId);
  const model = useMemo(() => nativeReminderPreferences(JSON.stringify([process.env.EXPO_PUBLIC_NEON_AUTH_URL, userId]), () => {
    const state = session.getSnapshot(); return !state.checking && state.user?.id === userId;
  }), [session, userId]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const [hour, setHour] = useState(state.hour);
  const [settingsError, setSettingsError] = useState('');
  const syncRequest = useAuthRequest(setSettingsError);
  useEffect(() => { setHour(state.hour); }, [state.hour]);
  useEffect(() => {
    const changed = () => {
      const current = session.getSnapshot();
      if (!current.checking && current.user?.id === userId) { void model.refresh(); void scheduler.inspect(scope); }
    };
    changed(); return session.subscribe(changed);
  }, [model, session, userId, scheduler, scope]);
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
    <PrimaryButton label="Sync Expiry Reminders" loading={syncRequest.loading || schedule.busy}
      disabled={!state.ready || state.busy || (enabled && pantry.readOnly)} onPress={() => {
        setSettingsError(''); void syncRequest.run(async () => { await pantry.syncReminders(); });
      }} />
    {enabled && pantry.readOnly && <Text style={ui.text}>Refresh live Pantry before syncing enabled reminders.</Text>}
    <Text style={ui.label} accessibilityLiveRegion="polite">{schedule.message}</Text>
    <Text style={ui.text}>Scheduled alerts at last check: {schedule.scope === scope ? schedule.count : 0}{schedule.scope === scope && schedule.nextAt
      ? ` · Next: ${new Date(schedule.nextAt).toLocaleString()}` : ''}</Text>
    <Text style={ui.text}>Alerts at 3 days before, 1 day before and on expiry day use your saved device-local time; past times are skipped. Up to 60 nearest alerts fit in the queue. Reminders refresh automatically after Pantry or preference changes and when the app opens or resumes with a verified session. Sync is available for retry.</Text>
    <Text style={ui.text}>Saved for this account on this device. Household expiry dates remain Asia/Kolkata. Delivery timing depends on device settings.</Text>
  </View>;
}
