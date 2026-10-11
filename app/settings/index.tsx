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
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/insights')}>
    <Text style={ui.title}>Kitchen Preferences</Text><View style={ui.card}>
      <View style={ui.row}><Text style={ui.heading}>Daily Kitchen Digest</Text><Switch value={digest} onValueChange={setDigest}
        accessibilityLabel="Daily kitchen digest" trackColor={{ true: Colors.primary }} /></View>
      <FormInput label="Reminder window (HH:MM)" accessibilityLabel="Reminder window" value={hour} onChangeText={setHour} />
      <PrimaryButton label="Save Preferences" onPress={() => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) { setNotice('Enter a valid 24-hour time such as 17:00.'); return; }
        preferences.setHour(hour); preferences.setDigest(digest); setNotice('Preferences saved for this demo session.');
      }} />
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <Text style={ui.text}>Prototype preferences only. Notifications are not scheduled in Phase 1.</Text>
    </View>
  </PrototypeScreen>;
}
