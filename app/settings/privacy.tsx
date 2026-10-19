import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { canAccessKitchen } from '@/lib/authSession';

/** Current data handling, not a published legal policy. */
export default function Privacy() {
  const { state } = useAuth();
  const back = () => router.canGoBack() ? router.back() : router.replace(canAccessKitchen(state) ? '/settings' : '/(auth)');
  return <PrototypeScreen back={back}>
    <Text style={ui.title}>Privacy & Data</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>Your account and groceries</Text>
      <Text style={ui.text}>Name, email and sign-in details are sent over HTTPS to Neon Auth. FreshTrack does not save your password or verification codes. Remembered sessions use secure device storage. Groceries and their history are saved through the authenticated FreshTrack API to your household in Neon PostgreSQL.</Text>
      <Text style={ui.heading}>Receipt photos and text</Text>
      <Text style={ui.text}>Receipt recognition runs on your device using Apple Vision on iPhone or ML Kit on Android. Receipt photos, recognized text and positions are not uploaded by the receipt workflow. Only grocery fields you review and confirm are sent to FreshTrack.</Text>
      <Text style={ui.text}>Clearing or leaving the receipt screen discards unconfirmed review data and attempts to delete temporary image copies. Original photos in your photo library are unchanged. Cleanup after an abrupt app termination is not guaranteed yet.</Text>
      <Text style={ui.heading}>Saved copies and retries</Text>
      <Text style={ui.text}>A limited read-only Pantry copy and confirmed pending purchases may be kept in secure device storage for your account. Sign-out clears the saved Pantry copy and pending receipt/barcode purchases. Pending notification outcomes remain tied to the same account for retry after sign-in. Signing out does not delete your account or groceries saved online.</Text>
      <Text style={ui.heading}>Recipes</Text>
      <Text style={ui.text}>The FreshTrack backend sends ingredient names to Spoonacular to suggest recipes. It does not send receipt photos or your sign-in credentials. Recipe responses are cached in backend memory for up to five minutes; cached entries may be removed earlier.</Text>
      <Text style={ui.heading}>Expiry reminders</Text>
      <Text style={ui.text}>Reminders use your device notification permission and local scheduling. Disable Reminders cancels FreshTrack alerts; it does not revoke the device permission. Reminder preferences are saved on this device for your account.</Text>
      <Text style={ui.heading}>Account and data deletion</Text>
      <Text style={ui.text}>In-app account and server-data deletion are not available yet. Account name and email changes are also not available. This page describes the current development app; it is not a published legal policy.</Text>
      {state.demo && <><Text style={ui.heading}>Demo Kitchen</Text>
        <Text style={ui.text}>Demo groceries and profile edits stay in memory. Reloading restores sample data. The demo does not create an account or save purchases online.</Text></>}
      <PrimaryButton label="Done" onPress={back} />
    </View>
  </PrototypeScreen>;
}
