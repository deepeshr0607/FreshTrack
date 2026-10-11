/** Phase 2 proof of concept using the existing account/OTP design language. */
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import { applyOtpInput, validEmail } from '@/lib/auth';
import { NeonAuthError } from '@/lib/neonAuth';
import { nativeAuthProbe as auth } from '@/features/auth/nativeProbe';
import { useAuth } from '@/context/AuthContext';

export default function NativeAuthCheck() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [sent, setSent] = useState(false);
  const { session, state } = useAuth();
  const user = state.user;
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [readyAt, setReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);
  const mounted = useRef(true);
  const inputs = useRef<(TextInput | null)[]>([]);
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setNotice('');
    try { await action(); }
    catch (error) {
      if (mounted.current) setNotice(error instanceof NeonAuthError
        ? `${error.message}${/^[A-Z_0-9]{1,40}$/.test(error.code) ? ` (${error.code})` : ''}`
        : 'Unable to access secure authentication. Please retry.');
    } finally { busy.current = false; if (mounted.current) setLoading(false); }
  };
  const restore = () => run(async () => {
    if (!auth) return;
    const restored = await session.refresh();
    if (mounted.current) { setNotice(restored ? 'Session verified with Neon.' : 'No active session. Sign in with your email.'); }
  });
  useEffect(() => {
    mounted.current = true;
    void restore();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  const cooldown = Math.max(0, Math.ceil((readyAt - now) / 1000));
  const send = () => {
    if (cooldown || !auth) return;
    if (!validEmail(email) || !name.trim()) { setNotice('Enter your name and a valid email address.'); return; }
    void run(async () => {
      if (!auth) return;
      await auth.sendOtp(email.trim().toLowerCase());
      if (mounted.current) { setSent(true); setDigits(Array(6).fill('')); setReadyAt(Date.now() + 30_000); setNotice('Check your email for the six-digit code.'); inputs.current[0]?.focus(); }
    });
  };
  const verify = () => { void run(async () => {
    if (!auth) return;
    const client = auth;
    await session.authenticate(() => client.verifyOtp(email.trim().toLowerCase(), digits.join(''), name.trim()));
    if (mounted.current) { setDigits(Array(6).fill('')); setSent(false); }

  }); };
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <PrimaryButton label="← Back to Welcome" variant="ghost" disabled={loading} onPress={() => router.replace('/(auth)')} />
          <Text style={styles.title}>{user ? 'Welcome Back' : sent ? 'Verify Your Email' : 'Sign In With Email'}</Text>
          <Text style={styles.text}>Development authentication check</Text>
          <View style={styles.card}>
            {!auth ? <Text style={styles.text}>{Platform.OS === 'web' ? 'Open this check on iPhone or Android with Expo Go.' : 'The development Auth URL or app origin is missing or invalid. Restart Expo after configuring it.'}</Text>
              : user ? <>
                <Text style={styles.text}>Signed in as {user.email}</Text>
                <Text style={styles.text}>Close and reopen FreshTrack, then return here to check your saved session.</Text>
                <PrimaryButton label="Continue to Demo Kitchen" disabled={loading} onPress={() => router.replace('/(tabs)')} />
                <PrimaryButton label="Check Session" loading={loading} onPress={() => void restore()} />
                <PrimaryButton label="Sign Out" variant="ghost" disabled={loading} onPress={() => void run(async () => {
                  if (!auth) return;
                  await session.signOut();
                  if (mounted.current) { setSent(false); setDigits(Array(6).fill('')); setNotice('Signed out. Saved session cleared.'); }
                })} />
              </> : <>
                <FormInput label="Full Name" accessibilityLabel="Full Name" value={name} onChangeText={setName} editable={!loading && !sent} autoComplete="name" />
                <FormInput label="Email Address" accessibilityLabel="Email Address" value={email} onChangeText={setEmail} editable={!loading && !sent} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                {sent && <>
                  <Text style={styles.text}>Enter the six-digit code sent to {email.trim()}.</Text>
                  <View style={styles.row}>{digits.map((digit, index) => <TextInput key={index} ref={(input) => { inputs.current[index] = input; }}
                    style={styles.digit} value={digit} keyboardType="number-pad" maxLength={6} editable={!loading}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'} textContentType={index === 0 ? 'oneTimeCode' : 'none'} selectTextOnFocus
                    accessibilityLabel={`OTP digit ${index + 1}`} onChangeText={(value) => {
                      setDigits((previous) => applyOtpInput(previous, value, index));
                      const count = value.replace(/\D/g, '').length;
                      if (count) inputs.current[Math.min(5, count === 6 ? 5 : index + count)]?.focus();
                    }} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !digit && index > 0) inputs.current[index - 1]?.focus(); }} />)}</View>
                  <PrimaryButton label="Verify & Continue →" loading={loading} onPress={verify} />
                </>}
                <PrimaryButton label={sent ? cooldown ? `Resend in ${cooldown}s` : 'Resend Code' : 'Send Email Code →'} loading={loading} disabled={cooldown > 0} onPress={send} variant={sent ? 'ghost' : 'primary'} />
                {!sent && <PrimaryButton label="Use a Code Already Received" variant="ghost" disabled={loading} onPress={() => {
                  if (!validEmail(email) || !name.trim()) { setNotice('Enter your name and a valid email address.'); return; }
                  setSent(true); setDigits(Array(6).fill('')); setNotice('No new code was requested. Enter an existing sign-in code; Neon checks whether it is still valid.');
                }} />}
                {sent && <PrimaryButton label="Use a Different Email" variant="ghost" disabled={loading} onPress={() => { setSent(false); setDigits(Array(6).fill('')); setNotice(''); }} />}
                <PrimaryButton label="Check Saved Session" variant="ghost" disabled={loading} onPress={() => void restore()} />
              </>}
            {!!notice && <Text style={styles.text} accessibilityLiveRegion="polite">{notice}</Text>}
          </View>
          <Text style={styles.text}>This sends real email and may create an account on the development branch. Kitchen data remains a demo.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1, padding: Spacing.screenGutter, gap: Spacing.base, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center' },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: FontSize.displayLg, color: Colors.onSurface, textAlign: 'center' },
  text: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant, lineHeight: 22, textAlign: 'center' },
  card: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.base, borderRadius: Radius.xl, gap: Spacing.base },
  row: { flexDirection: 'row', gap: Spacing.sm },
  digit: { flex: 1, minWidth: 0, height: 56, textAlign: 'center', borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.surfaceContainerLow, fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.headlineMd, color: Colors.onSurface },
});
