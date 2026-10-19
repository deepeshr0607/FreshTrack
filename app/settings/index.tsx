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
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/insights')}>
    <Text style={ui.title}>Kitchen Preferences</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>{state.user ? 'Household currency: INR (₹)' : `Demo currency: ${MOCK_CURRENCY.code} (${MOCK_CURRENCY.symbol})`}</Text>
      <Text style={ui.text}>{state.user ? 'Grocery values use rupees. Household dates use Asia/Kolkata. Currency and timezone are fixed for this household.' : 'Values use US dollars to match the supplied designs. Purchase values cover the whole entry. Currency is fixed for this prototype.'}</Text>
    </View>
    <View style={ui.card}>
      <Text style={ui.heading}>{state.user?.name || preferences.profile.name}</Text><Text style={ui.text}>{state.user?.email || preferences.profile.email}</Text>
      <Text style={ui.text}>{state.user ? 'Your groceries and their history are connected to your signed-in household.' : 'Demo session. No authenticated account.'}</Text>
      <PrimaryButton label={state.user ? "Account Details" : "Edit Profile"} variant="ghost" onPress={() => router.push('/settings/profile')} />
      <PrimaryButton label="Privacy & Data" variant="ghost" onPress={() => router.push('/settings/privacy')} />
    </View>
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
    {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
    <View style={ui.card}>
      {state.user ? <>
        <Text style={ui.heading}>Account Session</Text>
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
    </View>
  </PrototypeScreen>;
}
