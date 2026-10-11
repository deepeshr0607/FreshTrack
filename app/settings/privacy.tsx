import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { canAccessKitchen } from '@/lib/authSession';

/** Honest prototype information, not a published legal policy. */
export default function Privacy() {
  const { state } = useAuth();
  const back = () => router.canGoBack() ? router.back() : router.replace(canAccessKitchen(state) ? '/settings' : '/(auth)');
  return <PrototypeScreen back={back}>
    <Text style={ui.title}>Privacy & Demo Information</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>Your demo data</Text>
      <Text style={ui.text}>Profile, kitchen inventory, recipes and preferences stay in this app's memory for the demo. Reloading restores sample kitchen data. Preview Demo Kitchen does not create an account. Demo form passwords are used only for local validation and are not saved.</Text>
      <Text style={ui.heading}>Development authentication</Text>
      <Text style={ui.text}>Native Get Started and Log In use Neon on the development branch. Name, email and password are sent over HTTPS to Neon; Neon emails verification codes. Remembered sessions use secure device storage. Unremembered sessions stay in memory. Passwords and codes are not stored by this app. Sign Out requests session revocation from Neon.</Text>
      <Text style={ui.heading}>Camera and notifications</Text>
      <Text style={ui.text}>Scanner access is simulated. The app does not capture receipts, request camera permission or schedule notifications in this prototype.</Text>
      <Text style={ui.heading}>Terms and account controls</Text>
      <Text style={ui.text}>This page explains the prototype. Production Terms of Service, Privacy Policy and account deletion are not available yet and require review before launch.</Text>
      <PrimaryButton label="Done" onPress={back} />
    </View>
  </PrototypeScreen>;
}
