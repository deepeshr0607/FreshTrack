import ReceiptPhotoPrivacyCard from '@/components/ReceiptPhotoPrivacyCard';
import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { s, SettingsDisclosure, SettingsHeader, SettingsIcon } from '@/features/settings/SettingsPresentation';
import { canAccessKitchen } from '@/lib/authSession';

/** Current data handling, not a published legal policy. */
export default function Privacy() {
  const { state } = useAuth();
  const back = () => router.canGoBack() ? router.back() : router.replace(canAccessKitchen(state) ? '/settings' : '/(auth)');
  return <PrototypeScreen header={<SettingsHeader title="Privacy & Data" onBack={back} />}>
    <Text style={s.title}>Your data. Your choice.</Text>
    <View style={s.card}><View style={s.row}><View style={s.iconTile}><SettingsIcon name="cellphone-lock" /></View><Text style={[s.heading, { flex: 1 }]}>Receipt reading stays on device</Text></View><Text style={s.body}>Photos and recognized text are not uploaded by the receipt workflow. Only grocery fields you review and confirm are sent to FreshTrack.</Text></View>
    <SettingsDisclosure title="Your account and groceries" icon="account-lock-outline">
      <Text style={ui.text}>Name, email and sign-in details are sent over HTTPS to Neon Auth. FreshTrack does not save your password or verification codes. Remembered sessions use secure device storage. Groceries and their history are saved through the authenticated FreshTrack API to your household in Neon PostgreSQL.</Text>
    </SettingsDisclosure>
    <SettingsDisclosure title="Receipt photos and text" icon="receipt-text-outline">
      <Text style={ui.text}>Receipt recognition runs on your device using Apple Vision on iPhone or ML Kit on Android. Receipt photos, recognized text and positions are not uploaded by the receipt workflow. Only grocery fields you review and confirm are sent to FreshTrack.</Text>
      <Text style={ui.text}>Clearing or leaving a scan discards unconfirmed text and review data. FreshTrack removes its managed photo copies when no longer in use, and clears abandoned copies the next time the app opens or resumes. Original library photos are unchanged. Files created by the camera/photo processor before it returns control, older untracked copies and OS backups are outside this cleanup guarantee.</Text>
    </SettingsDisclosure>
    <SettingsDisclosure title="Saved copies and retries" icon="cloud-sync-outline">
      <Text style={ui.text}>A limited read-only Pantry copy and confirmed pending purchases may be kept in secure device storage for your account. Sign-out clears the saved Pantry copy and pending receipt/barcode purchases. Pending notification outcomes remain tied to the same account for retry after sign-in. Signing out does not delete your account or groceries saved online.</Text>
    </SettingsDisclosure>
    <SettingsDisclosure title="Recipes" icon="chef-hat">
      <Text style={ui.text}>The FreshTrack backend sends ingredient names to Spoonacular to suggest recipes. It does not send receipt photos or your sign-in credentials. Recipe responses are cached in backend memory for up to five minutes; cached entries may be removed earlier.</Text>
    </SettingsDisclosure>
    <SettingsDisclosure title="Expiry reminders" icon="bell-outline">
      <Text style={ui.text}>Reminders use your device notification permission and local scheduling. Disable Reminders cancels FreshTrack alerts; it does not revoke the device permission. Reminder preferences are saved on this device for your account.</Text>
    </SettingsDisclosure>
    <SettingsDisclosure title="Account and data deletion" icon="delete-outline">
      <Text style={ui.text}>Settings → Account Details → Delete Account & Data removes a sole-owner household and then requests Neon account deletion. It requires your email, DELETE and current password. A failed Neon step can be retried after FreshTrack data is deleted and locked. A one-way account fingerprint and deletion time are retained to block old-token access. Shared-household deletion is unavailable. Provider backups and other devices are not remotely erased. Account name/email changes are unavailable. This page describes the development app, not a published legal policy.</Text>
    </SettingsDisclosure>
    {state.demo && <SettingsDisclosure title="Demo Kitchen" icon="leaf"><Text style={ui.text}>Demo groceries and profile edits stay in memory. Reloading restores sample data. The demo does not create an account or save purchases online.</Text></SettingsDisclosure>}
    <ReceiptPhotoPrivacyCard />
    <PrimaryButton label="Done" onPress={back} />
  </PrototypeScreen>;
}
