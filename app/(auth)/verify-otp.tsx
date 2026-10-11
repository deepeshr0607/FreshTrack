/**
 * OTP Verification screen
 * Design reference: freshtrack_account_sign_up_login — six-digit OTP step
 * Note: The supplied designs show the sign-up/login forms; the OTP screen
 * is described in the product spec as a six-digit email verification step.
 * This screen follows the spec and design language.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEMO_AUTH, applyOtpInput, otpResult } from '@/lib/auth';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import useDemoRequest from '@/features/auth/useDemoRequest';
import useAuthRequest from '@/features/auth/useAuthRequest';
import { nativeAuthProbe as auth } from '@/features/auth/nativeProbe';
import { NeonAuthError } from '@/lib/neonAuth';
import { useAuth } from '@/context/AuthContext';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

const OTP_LENGTH = DEMO_AUTH.length;

export default function VerifyOtpScreen() {
  const { preview, mode, email } = useLocalSearchParams<{ preview?: string; mode?: string; email?: string }>();
  const realAuth = Platform.OS !== 'web' && mode !== 'demo';
  const targetEmail = typeof email === 'string' ? email : '';
  const { session } = useAuth();
  const { profile } = useMockPreferences();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const demoRequest = useDemoRequest();
  const run = demoRequest.run;
  const [resendReadyAt, setResendReadyAt] = useState(() => realAuth ? Date.now() + DEMO_AUTH.cooldownSeconds * 1000 : 0);
  const [issuedAt, setIssuedAt] = useState(() => Date.now() - (preview === 'expired' ? DEMO_AUTH.lifetimeMs : 0));
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState('');
  const realRequest = useAuthRequest(setNotice);
  const loading = demoRequest.loading || realRequest.loading;
  const [emailVerified, setEmailVerified] = useState(false);
  const [networkFailure, setNetworkFailure] = useState(preview === 'error');
  const [resendFailure, setResendFailure] = useState(preview === 'resend-error');
  const inputs = useRef<(TextInput | null)[]>([]);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const resendCooldown = Math.max(0, Math.ceil((resendReadyAt - now) / 1000));
  const remaining = Math.max(0, Math.ceil((issuedAt + DEMO_AUTH.lifetimeMs - now) / 1000));
  const handleChange = (value: string, index: number) => {
    setOtp((previous) => applyOtpInput(previous, value, index));
    setNotice('');
    const count = value.replace(/\D/g, '').length;
    if (count) inputs.current[Math.min(OTP_LENGTH - 1, count === OTP_LENGTH ? OTP_LENGTH - 1 : index + count)]?.focus();
  };
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };
  const handleVerify = () => {
    if (loading) return;
    const code = otp.join('');
    if (!emailVerified && otpResult(code, issuedAt, Date.now()) === 'incomplete') { setNotice('Enter all six digits.'); return; }
    setNotice('');
    if (realAuth) {
      void realRequest.run(async (isMounted) => {
        if (!auth) throw new NeonAuthError('CONFIG', 'The development Auth URL or app origin is missing or invalid.');
        const client = auth;
        if (emailVerified) {
          const user = await session.refresh();
          if (isMounted() && !user) router.replace({ pathname: '/(auth)/sign-in', params: { email: targetEmail, verified: 'yes' } });
          return;
        }
        const user = await session.authenticate(async () => {
          const accepted = await client.verifyEmail(targetEmail, code);
          if (isMounted()) { setEmailVerified(true); setOtp(Array(OTP_LENGTH).fill('')); }
          return accepted;
        });
        if (isMounted() && !user) router.replace({ pathname: '/(auth)/sign-in', params: { email: targetEmail, verified: 'yes' } });
      });
      return;
    }
    // Phase 1: simulate OTP validation → navigate to app; never contact an auth provider.
    run(() => {
      if (networkFailure) { setNetworkFailure(false); setNotice('Demo verification failed. Try again.'); return; }
      const result = otpResult(code, issuedAt, Date.now());
      if (result === 'expired') { setNotice('This demo code has expired. Resend a code to continue.'); return; }
      if (result !== 'success') { setNotice('That code is incorrect. Check the six-digit demo code.'); return; }
      if (!session.enterDemo()) setNotice('Demo preview is unavailable. Use real sign-in.');
    });
  };
  const handleResend = () => {
    if (resendCooldown > 0 || loading) return;
    if (realAuth) {
      setNotice('');
      void realRequest.run(async (isMounted) => {
        if (!auth) throw new NeonAuthError('CONFIG', 'The development Auth URL or app origin is missing or invalid.');
        await auth.sendVerificationOtp(targetEmail);
        if (!isMounted()) return;
        const timestamp = Date.now(); setIssuedAt(timestamp); setNow(timestamp);
        setOtp(Array(OTP_LENGTH).fill('')); setResendReadyAt(timestamp + DEMO_AUTH.cooldownSeconds * 1000);
        setNotice('New verification code sent. Use the newest email.'); inputs.current[0]?.focus();
      });
      return;
    }
    run(() => {
      if (resendFailure) { setResendFailure(false); setNotice('Unable to resend the demo code. Try again.'); return; }
      const timestamp = Date.now();
      setIssuedAt(timestamp); setNow(timestamp);
      setOtp(Array(OTP_LENGTH).fill('')); setResendReadyAt(timestamp + DEMO_AUTH.cooldownSeconds * 1000);
      setNotice('New demo code ready. No email was sent.'); inputs.current[0]?.focus();
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/sign-up')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to sign-up">
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📧</Text>
          </View>

          <Text style={styles.headline}>Verify Your Email</Text>
          <Text style={styles.subtext}>
            {realAuth ? `Enter the six-digit code sent to ${targetEmail || 'your email'}.` : `Enter the six-digit demo code for ${profile.email}.`}
          </Text>

          {/* OTP inputs */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                editable={!loading && !emailVerified}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                textContentType={i === 0 ? "oneTimeCode" : "none"}
                selectTextOnFocus
                accessibilityLabel={`OTP digit ${i + 1}`}
                textAlign="center"
              />
            ))}
          </View>

          <Text style={styles.subtext} accessibilityLiveRegion="polite">{realAuth ? emailVerified ? 'Email verified. Retry the saved session check.' : 'Code expiry is checked by Neon. Use the latest verification email.' : remaining ? `Code expires in ${remaining}s` : 'Demo code expired. Resend to continue.'}</Text>
          {!!notice && <Text style={styles.subtext} accessibilityLiveRegion="polite">{notice}</Text>}
          <PrimaryButton
            label={emailVerified ? 'Check Session →' : 'Verify & Continue →'}
            onPress={handleVerify}
            loading={loading}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive it? </Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0 || loading || emailVerified}
              accessibilityRole="button"
            >
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
                {loading ? 'Please wait…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </Pressable>
          </View>

          {realAuth && <PrimaryButton label="Back to Log In" variant="ghost" disabled={loading}
            onPress={() => router.replace({ pathname: '/(auth)/sign-in', params: { email: targetEmail } })} />}
          <Text style={styles.note}>
            {realAuth ? 'Verifies your development account. Kitchen data remains a demo.' : `Demo code: ${DEMO_AUTH.code}. No email is sent or account verified. Reloading resets the demo.`}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.xl,
    gap: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.freshGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40 },
  headline: {
    fontSize: FontSize.displayLg,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
  },
  subtext: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.base,
    width: '100%', maxWidth: 360,
  },
  otpInput: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    fontSize: FontSize.headlineMd,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.freshGreenBg,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resendText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  resendLink: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  resendDisabled: { color: Colors.onSurfaceVariant },
  note: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontFamily: 'PlusJakartaSans_400Regular',
    paddingHorizontal: Spacing.base,
  },
});
