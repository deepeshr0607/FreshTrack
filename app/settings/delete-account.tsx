import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { useRealPantry } from '@/context/RealPantryContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import useAuthRequest from '@/features/auth/useAuthRequest';
import { clearDeletedAccountDeviceData } from '@/features/settings/nativeAccountCleanup';
import { createAccountDeletionApi, performAccountDeletion } from '@/lib/accountDeletion';
import type { AccountDeletionReview } from '@/types/api';

/** Uses the existing keyboard-aware Settings form; no separate deletion design was supplied. */
export default function DeleteAccount() {
  const { state, session } = useAuth();
  const real = useRealPantry();
  const [review, setReview] = useState<AccountDeletionReview | null>(null);
  const [email, setEmail] = useState(''), [confirmation, setConfirmation] = useState(''), [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const request = useAuthRequest(setNotice);
  const runRequest = request.run;
  const api = useMemo(() => {
    if (Platform.OS === 'web' || !nativeAuthProbe) return null;
    try { return createAccountDeletionApi(process.env.EXPO_PUBLIC_API_URL, () => nativeAuthProbe!.getApiToken(), __DEV__); }
    catch { return null; }
  }, []);
  const refresh = useCallback(() => {
    if (!api) return;
    setNotice('');
    void runRequest(async mounted => { const result = await api.review(); if (mounted()) setReview(result); });
  }, [api, runRequest]);
  useEffect(() => { refresh(); }, [refresh]); // Account-scoped route unmounts on sign-out.
  const back = () => router.canGoBack() ? router.back() : router.replace('/settings/profile');
  const disabled = request.loading || !review || review.state === 'SHARED_HOUSEHOLD' || state.checking;
  const submit = () => {
    if (!api || !nativeAuthProbe || !state.user || disabled) return;
    if (email.trim().toLowerCase() !== state.user.email.toLowerCase() || confirmation !== 'DELETE' || password.length < 8 || password.length > 128) {
      setNotice('Enter your signed-in email, DELETE and your current password (8–128 characters).'); return;
    }
    Alert.alert('Permanently delete account and data?',
      'This cannot be undone. Your groceries, history and receipt records will be removed first, followed by your Neon account. If Neon fails, FreshTrack stays locked and you can retry here.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete Permanently', style: 'destructive', onPress: () => {
        const subject = state.user!.id, input = { email: email.trim(), confirmation, password };
        setPassword(''); setNotice('');
        void request.run(async mounted => {
          await session.deleteAccount(subject, () => performAccountDeletion(input, {
            ...api, verifyPassword: value => nativeAuthProbe!.verifyPassword(value),
            clearDevice: () => clearDeletedAccountDeviceData(subject, real.notificationOutbox),
            deleteUser: value => nativeAuthProbe!.deleteUser(value),
            dataDeleted: () => { if (mounted()) setReview({ state: 'DATA_DELETED', counts: { groceries: 0, events: 0, receipts: 0 } }); },
          }));
        });
      } }]);
  };
  if (!state.user || state.demo) return <PrototypeScreen back={back}><Text style={ui.title}>Account Deletion</Text>
    <Text style={ui.text}>Sign in to a real account to manage its data.</Text></PrototypeScreen>;
  return <PrototypeScreen back={request.loading ? undefined : back}>
    <Text style={ui.title}>Delete Account & Data</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>{state.user.email}</Text>
      <Text style={ui.text}>Deletion is permanent. Only your signed-in account can be selected. Your current password is checked with Neon before any data is removed.</Text>
      {!api && <Text style={ui.text} accessibilityRole="alert">Account deletion is unavailable in this build. Use the configured FreshTrack phone app.</Text>}
      {!review && api && <Text style={ui.text}>Load the account review before confirming. Opening this page does not delete anything.</Text>}
      {review?.state === 'READY' && <><Text style={ui.heading}>Data to remove</Text>
        <Text style={ui.text}>{review.counts.groceries} groceries · {review.counts.events} history entries · {review.counts.receipts} receipt records. Includes active, used, wasted and archived groceries. Counts may change before confirmation.</Text>
        <Text style={ui.text}>Your sole-owner household and server preferences will also be removed. This device's saved Pantry copy, pending purchases/actions and reminder preferences will be cleared, and FreshTrack alerts cancelled. Photos in your photo library are unchanged.</Text></>}
      {review?.state === 'SHARED_HOUSEHOLD' && <Text style={ui.text} accessibilityRole="alert">This household has other members. Shared-household deletion is unavailable, so this flow cannot delete any account or household data.</Text>}
      {review?.state === 'DATA_DELETED' && <Text style={ui.text} accessibilityRole="alert">Your FreshTrack data is deleted and locked. Neon account deletion still needs to finish. Re-enter your password and confirm to retry; deleted groceries cannot be restored.</Text>}
      <Text style={ui.text}>A one-way account fingerprint and deletion time are retained to block old tokens from recreating your data. Provider backups and other devices are not remotely erased by this flow.</Text>
      <PrimaryButton label="Refresh Deletion Review" variant="ghost" loading={request.loading} disabled={!api} onPress={refresh} />
    </View>
    <View style={ui.card}>
      <FormInput label="Confirm your email" accessibilityLabel="Deletion confirmation email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!disabled} />
      <FormInput label="Type DELETE" accessibilityLabel="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" editable={!disabled} />
      <FormInput label="Current password" accessibilityLabel="Current password for deletion" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!disabled} />
      {!!notice && <Text style={ui.text} accessibilityRole="alert">{notice}</Text>}
      <PrimaryButton label={review?.state === 'DATA_DELETED' ? 'Finish Account Deletion' : 'Delete Account & Data'} disabled={disabled || !api} loading={request.loading} onPress={submit} />
      <PrimaryButton label={review?.state === 'DATA_DELETED' ? 'Back to Account' : 'Cancel'} variant="ghost" disabled={request.loading} onPress={back} />
    </View>
  </PrototypeScreen>;
}
