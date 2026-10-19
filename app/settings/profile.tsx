import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import { validateProfile } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';

/** Session-only profile editor; no separate reference screen was supplied. */
export default function Profile() {
  const preferences = useMockPreferences();
  const { state } = useAuth();
  const [name, setName] = useState(preferences.profile.name);
  const [email, setEmail] = useState(preferences.profile.email);
  const [notice, setNotice] = useState('');
  const back = () => router.canGoBack() ? router.back() : router.replace('/settings');
  if (state.user) return <PrototypeScreen back={back}>
    <Text style={ui.title}>Your Account</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>{state.user.name}</Text><Text style={ui.text}>{state.user.email}</Text>
      <Text style={ui.text}>Your signed-in account details. Name and email changes are not available yet.</Text>
      <PrimaryButton label="Back to Settings" variant="ghost" onPress={back} />
    </View>
  </PrototypeScreen>;
  return <PrototypeScreen back={back}>
    <Text style={ui.title}>Your Profile</Text>
    <View style={ui.card}>
      <FormInput label="Full Name" accessibilityLabel="Full Name" value={name} onChangeText={setName} autoComplete="name" />
      <FormInput label="Email Address" accessibilityLabel="Email Address" value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <PrimaryButton label="Save Profile" onPress={() => {
        const error = validateProfile({ name, email });
        if (error) { setNotice(error); return; }
        preferences.setProfile({ name: name.trim(), email: email.trim().toLowerCase() });
        setNotice('Profile saved for this demo session.');
      }} />
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <PrimaryButton label="Cancel" variant="ghost" onPress={back} />
      <Text style={ui.text}>Your changes stay in memory until reload. Changing this email does not change or verify an account.</Text>
    </View>
  </PrototypeScreen>;
}
