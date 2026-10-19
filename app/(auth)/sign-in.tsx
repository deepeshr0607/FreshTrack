import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/**
 * Sign-in / Log In screen
 * Design reference: design-reference/freshtrack_account_log_in/screen.png
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validateCredentials, validEmail } from '@/lib/auth';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import useDemoRequest from '@/features/auth/useDemoRequest';
import useAuthRequest from '@/features/auth/useAuthRequest';
import { nativeAuthProbe as auth } from '@/features/auth/nativeProbe';
import { NeonAuthError } from '@/lib/neonAuth';
import { useAuth } from '@/context/AuthContext';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

export default function SignInScreen() {
  const { session } = useAuth();
  const preferences = useMockPreferences();
  const { preview, mode, email: initialEmail, verified } = useLocalSearchParams<{ preview?: string; mode?: string; email?: string; verified?: string }>();
  const realAuth = !DIAGNOSTICS_ENABLED || (Platform.OS !== 'web' && mode !== 'demo');
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(preferences.rememberDevice);
  const demoRequest = useDemoRequest();

  const [notice, setNotice] = useState(verified === 'yes' ? 'Email verified. Log in with your password.' : '');
  const realRequest = useAuthRequest(setNotice);
  const loading = demoRequest.loading || realRequest.loading;
  const run = demoRequest.run;
  const [simulateFailure, setSimulateFailure] = useState(preview === 'error');
  const [providerNotice, setProviderNotice] = useState('');
  const explainProvider = (provider: string) => setProviderNotice(`${provider} is not connected yet. Use the email form to continue.`);

  const handleSubmit = () => {
    if (loading) return;
    const error = validateCredentials(email, password);
    if (error) { setNotice(error); return; }
    if (realAuth && (password.length < 8 || password.length > 128)) { setNotice('Use a password with 8–128 characters.'); return; }
    setNotice('');
    if (realAuth) {
      void realRequest.run(async (isMounted) => {
        if (!auth) throw new NeonAuthError('CONFIG', 'The development Auth URL or app origin is missing or invalid.');
        const client = auth;
        preferences.setRememberDevice(rememberDevice);
        await session.authenticate(() => client.signIn(email.trim().toLowerCase(), password, rememberDevice));
        if (!isMounted()) return;
        setPassword('');

      });
      return;
    }
    // Phase 1: simulate successful login → navigate to app; no password is retained.
    run(() => {
      if (simulateFailure) { setSimulateFailure(false); setNotice('Unable to log in in this demo. Try again.'); return; }
      preferences.setProfile({ ...preferences.profile, email: email.trim().toLowerCase() });
      preferences.setRememberDevice(rememberDevice);
      if (!session.enterDemo()) setNotice('Demo preview is unavailable. Use real sign-in.');
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header nav */}
          <View style={styles.navRow}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to welcome">
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.navTitle}>🌿  Log In</Text>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>M</Text>
            </View>
          </View>

          {/* Tagline */}
          <View style={styles.taglinePill}>
            <Text style={styles.taglineText}>🌿 SMART KITCHEN SYNC</Text>
          </View>
          <Text style={styles.headline}>Welcome Back</Text>
          <Text style={styles.subtext}>
            Access your smart pantry, expiration alerts & kitchen savings.
          </Text>

          {/* Tab switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={styles.tabBtn}
              onPress={() => router.replace({ pathname: '/(auth)/sign-up', params: { mode: realAuth ? 'real' : 'demo' } })}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
            >
              <Text style={styles.tabText}>Sign Up</Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
            >
              <Text style={[styles.tabText, styles.tabTextActive]}>Log In</Text>
            </Pressable>
          </View>

          <Text style={styles.subtext}>{realAuth ? 'Sign in securely to your FreshTrack household.' : 'Demo only. Use sample details; no account is created.'}</Text>
          {/* Form card */}
          <View style={styles.formCard}>
            <FormInput
              label="Email Address" accessibilityLabel="Email Address" editable={!loading}
              icon="✉️"
              placeholder="maya.kitchen@freshtrack.io"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              rightIcon={validEmail(email) ? '✅' : undefined}
            />
            <FormInput
              label="Password" accessibilityLabel="Password" editable={!loading}
              icon="🔒"
              placeholder="••••••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              rightIcon={showPassword ? '🙈' : '👁'}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />

            {/* Remember + Forgot */}
            <View style={styles.rememberRow}>
              <Pressable
                style={styles.checkRow}
                onPress={() => setRememberDevice((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberDevice }}
              >
                <View style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
                  {rememberDevice && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Remember this device</Text>
              </Pressable>
              <Pressable accessibilityRole="link" onPress={() => realAuth ? setProviderNotice('Password recovery is not available yet.') : router.push('/(auth)/recover')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>
            </View>

            {!!notice && <Text style={styles.subtext} accessibilityLiveRegion="polite">{notice}</Text>}
            {realAuth && <Pressable accessibilityRole="button" disabled={loading} onPress={() => {
              if (!validEmail(email)) { setNotice('Enter your email first.'); return; }
              setNotice('');
              void realRequest.run(async (isMounted) => {
                if (!auth) throw new NeonAuthError('CONFIG', 'The development Auth URL or app origin is missing or invalid.');
                await auth.sendVerificationOtp(email.trim().toLowerCase());
                if (isMounted()) { setPassword(''); router.push({ pathname: '/(auth)/verify-otp', params: { mode: 'real', email: email.trim().toLowerCase() } }); }
              });
            }}><Text style={styles.forgotText}>Verify an unverified email</Text></Pressable>}
            <PrimaryButton
              label="Log In to Kitchen →"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />

            {DIAGNOSTICS_ENABLED && <>
            {/* Social auth */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable style={styles.socialBtn} accessibilityRole="button" accessibilityLabel="Continue with Google" onPress={() => explainProvider('Google')}>
              <Text style={styles.socialIcon}>🇬</Text>
              <Text style={styles.socialText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.socialBtn} accessibilityRole="button" accessibilityLabel="Continue with Apple" onPress={() => explainProvider('Apple')}>
              <Text style={styles.socialIcon}>🍎</Text>
              <Text style={styles.socialText}>Continue with Apple</Text>
            </Pressable>
            <Pressable style={styles.socialBtn} accessibilityRole="button" accessibilityLabel="Sign in with Biometrics" onPress={() => explainProvider('Biometric sign-in')}>
              <Text style={styles.socialIcon}>🫆</Text>
              <Text style={styles.socialText}>Sign in with Biometrics</Text>
            </Pressable>
            </>}
            {!!providerNotice && <Text style={styles.subtext} accessibilityLiveRegion="polite">{providerNotice}</Text>}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Don't have an account?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.replace({ pathname: '/(auth)/sign-up', params: { mode: realAuth ? 'real' : 'demo' } })}
            >
              Sign Up
            </Text>
          </Text>
          <Text style={styles.legal}>
            Learn how FreshTrack handles your data.{' '}
            <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/settings/privacy')}>Privacy & Data</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: {
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  backText: { fontSize: FontSize.headlineMd, color: Colors.onSurface },
  navTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: { color: Colors.onPrimary, fontWeight: FontWeight.bold },
  taglinePill: {
    backgroundColor: Colors.freshGreenBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    alignSelf: 'center',
  },
  taglineText: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headline: {
    fontSize: FontSize.displayLg,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabBtnActive: { backgroundColor: Colors.surfaceContainerLowest },
  tabText: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  tabTextActive: { color: Colors.primary },
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.onPrimary, fontSize: 13, fontWeight: FontWeight.bold },
  rememberText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  forgotText: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.base,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.outlineVariant },
  dividerText: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  socialIcon: { fontSize: 18 },
  socialText: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  footer: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  legal: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  legalLink: { color: Colors.primary, textDecorationLine: 'underline' },
});
