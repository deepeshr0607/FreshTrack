import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';

/** Honest prototype information, not a published legal policy. */
export default function Privacy() {
  const back = () => router.canGoBack() ? router.back() : router.replace('/settings');
  return <PrototypeScreen back={back}>
    <Text style={ui.title}>Privacy & Demo Information</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>Your demo data</Text>
      <Text style={ui.text}>Profile, kitchen inventory, recipes and preferences stay in this app's memory for the demo. Reloading restores the sample data. No real account is created. Password input is used for local validation only and is not saved.</Text>
      <Text style={ui.heading}>Camera and notifications</Text>
      <Text style={ui.text}>Scanner access is simulated. The app does not capture receipts, request camera permission, send emails or schedule notifications in this prototype.</Text>
      <Text style={ui.heading}>Terms and account controls</Text>
      <Text style={ui.text}>This page explains the prototype. Production Terms of Service, Privacy Policy and account deletion are not available yet and require review before launch.</Text>
      <PrimaryButton label="Done" onPress={back} />
    </View>
  </PrototypeScreen>;
}
