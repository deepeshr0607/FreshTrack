import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { validEmail } from '@/lib/auth';
import useDemoRequest from '@/features/auth/useDemoRequest';

/** Recovery preview only; no email, credentials or password changes. */
export default function Recovery() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [fail, setFail] = useState(preview === 'error');
  const { loading, run } = useDemoRequest();
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.replace('/(auth)/sign-in')}>
    <Text style={ui.title}>Forgot Password?</Text>
    <View style={ui.card}>
      <Text style={ui.text}>Preview email recovery with sample details. No email is sent and no password is changed.</Text>
      <FormInput label="Email Address" accessibilityLabel="Recovery email" keyboardType="email-address"
        autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} editable={!loading} />
      <PrimaryButton label="Preview Recovery" loading={loading} onPress={() => {
        if (!validEmail(email)) { setNotice('Enter a valid email address.'); return; }
        setNotice(''); run(() => {
          if (fail) { setFail(false); setNotice('Demo recovery failed. Try again.'); return; }
          setNotice('Recovery preview complete. In the connected version, check your email for recovery instructions.');
        });
      }} />
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <PrimaryButton label="Back to Log In" variant="ghost" onPress={() => router.replace('/(auth)/sign-in')} />
    </View>
  </PrototypeScreen>;
}
