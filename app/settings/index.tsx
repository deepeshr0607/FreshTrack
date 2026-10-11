import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import { Colors } from '@/constants/Theme';

/** Supporting prototype preference screen; no separate Settings reference was supplied. */
export default function Settings() {
  const preferences = useMockPreferences();
  const [hour, setHour] = useState(preferences.hour);
  const [digest, setDigest] = useState(preferences.digest);
  const [notice, setNotice] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/insights')}>
    <Text style={ui.title}>Kitchen Preferences</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>{preferences.profile.name}</Text><Text style={ui.text}>{preferences.profile.email}</Text>
      <PrimaryButton label="Edit Profile" variant="ghost" onPress={() => router.push('/settings/profile')} />
      <PrimaryButton label="Privacy & Demo Information" variant="ghost" onPress={() => router.push('/settings/privacy')} />
    </View>
    <View style={ui.card}>
      <View style={ui.row}><Text style={[ui.heading, { flex: 1 }]}>Daily Kitchen Digest</Text><Switch value={digest} onValueChange={setDigest}
        accessibilityLabel="Daily kitchen digest" trackColor={{ true: Colors.primary }} /></View>
      <FormInput label="Reminder window (HH:MM)" accessibilityLabel="Reminder window" value={hour} onChangeText={setHour} />
      <PrimaryButton label="Save Preferences" onPress={() => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) { setNotice('Enter a valid 24-hour time such as 17:00.'); return; }
        preferences.setHour(hour); preferences.setDigest(digest); setNotice('Preferences saved for this demo session.');
      }} />
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <Text style={ui.text}>Prototype preferences only. Notifications are not scheduled in Phase 1.</Text>
    </View>
    <View style={ui.card}>
      <View style={ui.row}><Text style={[ui.heading, { flex: 1 }]}>Remember this device</Text>
        <Switch value={preferences.rememberDevice} onValueChange={preferences.setRememberDevice}
          accessibilityLabel="Remember this device" trackColor={{ true: Colors.primary }} /></View>
      <Text style={ui.text}>Demo preference only; no credentials or session are stored.</Text>
      {confirmExit ? <>
        <Text style={ui.heading}>Leave the demo?</Text>
        <Text style={ui.text}>Return to the welcome screen. Kitchen data stays in memory until reload.</Text>
        <PrimaryButton label="Leave Demo" onPress={() => { preferences.setRememberDevice(false); router.replace('/(auth)'); }} />
        <PrimaryButton label="Stay Here" variant="ghost" onPress={() => setConfirmExit(false)} />
      </> : <PrimaryButton label="Sign Out of Demo" variant="ghost" onPress={() => setConfirmExit(true)} />}
    </View>
  </PrototypeScreen>;
}
