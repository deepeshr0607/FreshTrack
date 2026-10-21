import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React, { useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import { Colors } from '@/constants/Theme';
import { MOCK_CURRENCY } from '@/lib/mock';
import { useRealPantry } from '@/context/RealPantryContext';
import { useAuth } from '@/context/AuthContext';
import useAuthRequest from '@/features/auth/useAuthRequest';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { checkBackendHousehold, checkBackendIdentity } from '@/lib/backendIdentity';
import { s, SettingsHeader, SettingsLink, SettingsSection } from '@/features/settings/SettingsPresentation';
import ReminderPreferencesCard from '@/components/ReminderPreferencesCard';

/** Account and reminder settings; no separate Settings reference was supplied. */
export default function Settings() {
  const real = useRealPantry();
  const preferences = useMockPreferences();
  const { session, state } = useAuth();
  const [hour, setHour] = useState(preferences.hour);
  const [digest, setDigest] = useState(preferences.digest);
  const [notice, setNotice] = useState('');
  const savedCopyRequest = useAuthRequest(setNotice);
  const signOutRequest = useAuthRequest(setNotice);
  const backendRequest = useAuthRequest(setNotice);
  const householdRequest = useAuthRequest(setNotice);
  const [confirmExit, setConfirmExit] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/insights');
  const name = state.user?.name || preferences.profile.name;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] || '').join('').toUpperCase();
  return <PrototypeScreen header={<SettingsHeader title="Settings" onBack={back} />}>
    <View style={{ gap: 4 }}><Text style={s.title}>Make it your kitchen.</Text><Text style={s.body}>Your account, reminders and privacy in one place.</Text></View>
    <View style={s.hero}><View style={s.row}><View style={s.avatar}><Text style={s.initials}>{initials || 'FT'}</Text></View><View style={{ flex: 1 }}><Text style={s.heroName}>{name}</Text><Text style={s.heroText}>{state.user?.email || preferences.profile.email}</Text></View></View>
      <View style={s.heroBadge}><Text style={s.heroText}>{state.user ? 'Signed-in household' : 'Demo session'}</Text></View>
    </View>
    <SettingsSection title="Account & privacy" icon="account-outline">
      <SettingsLink title={state.user ? 'Account Details' : 'Edit Profile'} caption={state.user ? 'View your signed-in account' : 'Update your demo profile'} icon="account-circle-outline" onPress={() => router.push('/settings/profile')} />
      <SettingsLink title="Privacy & Data" caption="Photos, saved copies and data controls" icon="shield-lock-outline" onPress={() => router.push('/settings/privacy')} />
    </SettingsSection>
    {state.user && Platform.OS !== 'web' && <ReminderPreferencesCard key={state.user.id} userId={state.user.id} />}
    {state.demo && <View style={ui.card}>
      <View style={ui.row}><Text style={[ui.heading, { flex: 1 }]}>Daily Kitchen Digest</Text><Switch value={digest} onValueChange={setDigest}
        accessibilityLabel="Daily kitchen digest" trackColor={{ true: Colors.primary }} /></View>
      <FormInput label="Reminder window (HH:MM)" accessibilityLabel="Reminder window" value={hour} onChangeText={setHour} />
      <PrimaryButton label="Save Preferences" onPress={() => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) { setNotice('Enter a valid 24-hour time such as 17:00.'); return; }
        preferences.setHour(hour); preferences.setDigest(digest); setNotice('Preferences saved for this demo session.');
      }} />
      <Text style={ui.text}>Prototype preferences only. Demo preferences do not schedule notifications.</Text>
    </View>}
    <SettingsSection title="Household preferences" icon="home-outline">
      <View style={[s.row, { flexWrap: 'wrap' }]}><View style={s.badge}><Text style={s.label}>{state.user ? '₹ INR' : `${MOCK_CURRENCY.symbol} ${MOCK_CURRENCY.code}`}</Text></View><View style={s.badge}><Text style={s.label}>{state.user ? 'Asia/Kolkata' : 'Demo Kitchen'}</Text></View></View>
      <Text style={s.caption}>{state.user ? 'Currency and timezone are fixed for this household. Grocery values cover the whole entry.' : 'US dollar values match the supplied demo designs. Currency is fixed for the prototype.'}</Text>
    </SettingsSection>
    {!!notice && <View style={s.notice}><Text style={s.label} accessibilityLiveRegion="polite">{notice}</Text></View>}
    <SettingsSection title="Session" icon="login-variant">
      {state.user ? <>
        {DIAGNOSTICS_ENABLED && nativeAuthProbe && <PrimaryButton label="Check Backend Identity" variant="ghost" loading={backendRequest.loading}
          onPress={() => { setNotice(''); void backendRequest.run(async (isMounted) => {
            await checkBackendIdentity(process.env.EXPO_PUBLIC_API_URL, () => nativeAuthProbe!.getApiToken(), state.user!, __DEV__);
            if (isMounted()) setNotice('Backend identity verified for your signed-in account.');
          }); }} />}
        {DIAGNOSTICS_ENABLED && nativeAuthProbe && <PrimaryButton label="Check Backend Database" variant="ghost" loading={householdRequest.loading}
          onPress={() => { setNotice(''); void householdRequest.run(async (isMounted) => {
            const result = await checkBackendHousehold(process.env.EXPO_PUBLIC_API_URL, () => nativeAuthProbe!.getApiToken(), state.user!, __DEV__);
            if (isMounted()) setNotice(result === 'ready'
              ? 'Backend database verified. Your household is available (INR, Asia/Kolkata).'
              : 'Backend database verified. No household is set up for this account yet.');
          }); }} />}
        {DIAGNOSTICS_ENABLED && real.enabled && <PrimaryButton label="Test Saved Pantry Restore" variant="ghost" loading={savedCopyRequest.loading}
          onPress={() => void savedCopyRequest.run(async isMounted => {
            await real.restoreSavedPreview();
            if (isMounted()) router.push('/(tabs)/pantry');
          })} />}
        <Text style={ui.text}>Your remember-device choice is set when you log in. Sign out revokes this session and returns to Welcome.</Text>
        <PrimaryButton label="Sign Out" variant="ghost" loading={signOutRequest.loading}
          onPress={() => { setNotice(''); void signOutRequest.run(async () => { await session.signOut(); }); }} />
      </> : <>
        <View style={ui.row}><Text style={[ui.heading, { flex: 1 }]}>Remember this device</Text>
          <Switch value={preferences.rememberDevice} onValueChange={preferences.setRememberDevice}
            accessibilityLabel="Remember this device" trackColor={{ true: Colors.primary }} /></View>
        <Text style={ui.text}>Demo preference only; no credentials or session are stored.</Text>
        {confirmExit ? <>
          <Text style={ui.heading}>Leave the demo?</Text>
          <Text style={ui.text}>Return to Welcome and clear this prototype session.</Text>
          <PrimaryButton label="Leave Demo" onPress={() => session.exitDemo()} />
          <PrimaryButton label="Stay Here" variant="ghost" onPress={() => setConfirmExit(false)} />
        </> : <PrimaryButton label="Sign Out of Demo" variant="ghost" onPress={() => setConfirmExit(true)} />}
      </>}
    </SettingsSection>
  </PrototypeScreen>;
}
