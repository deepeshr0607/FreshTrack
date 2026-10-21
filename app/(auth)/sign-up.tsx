import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/**
 * Sign-up screen
 * Design reference: design-reference/freshtrack_account_sign_up_login/screen.png
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
import { validateCredentials, validateProfile, validEmail } from '@/lib/auth';
import { useMockPreferences } from '@/context/MockPreferencesContext';
import useDemoRequest from '@/features/auth/useDemoRequest';
import useAuthRequest from '@/features/auth/useAuthRequest';
import { nativeAuthProbe as auth } from '@/features/auth/nativeProbe';
import { NeonAuthError } from '@/lib/neonAuth';
import { AuthField as FormInput, AuthHeader, AuthNotice, authScreenStyles } from '@/features/auth/AuthPresentation';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

type Tab = 'sign-up' | 'sign-in';

export default function SignUpScreen() {
  const preferences = useMockPreferences();
  const [activeTab, setActiveTab] = useState<Tab>('sign-up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [digestOptIn, setDigestOptIn] = useState(preferences.digest);
  const demoRequest = useDemoRequest();
  const { preview, mode } = useLocalSearchParams<{ preview?: string; mode?: string }>();
  const realAuth = !DIAGNOSTICS_ENABLED || (Platform.OS !== 'web' && mode !== 'demo');
  const [notice, setNotice] = useState('');
  const realRequest = useAuthRequest(setNotice);
  const loading = demoRequest.loading || realRequest.loading;
  const run = demoRequest.run;
  const [simulateFailure, setSimulateFailure] = useState(preview === 'error');
  const [providerNotice, setProviderNotice] = useState('');
  const explainProvider = (provider: string) => setProviderNotice(`${provider} is not connected yet. Use the email form to continue.`);

  // Length guidance, not an unsubstantiated password-security score.
  const passwordStrength = password.length >= 8 && password.length <= 128 ? 3 : password.length > 0 ? 1 : 0;
  const strengthLabel = passwordStrength === 3 ? 'Length accepted' : 'Use 8–128 characters';
  const strengthColor = passwordStrength === 3 ? Colors.primary : Colors.onSurfaceVariant;

  const handleSubmit = () => {
    if (loading) return;
    const error = validateProfile({ name, email }) || validateCredentials(email, password);
    if (error) { setNotice(error); return; }
    if (realAuth && (password.length < 8 || password.length > 128)) { setNotice('Use a password with 8–128 characters.'); return; }
    setNotice('');
    if (realAuth) {
      void realRequest.run(async (isMounted) => {
        if (!auth) throw new NeonAuthError('CONFIG', 'The development Auth URL or app origin is missing or invalid.');
        await auth.signUp(name.trim(), email.trim().toLowerCase(), password);
        if (!isMounted()) return;
        setPassword('');
        preferences.setDigest(digestOptIn); // Local UI preference only; server preferences come later.
        router.push({ pathname: '/(auth)/verify-otp', params: { mode: 'real', email: email.trim().toLowerCase() } });
      });
      return;
    }
    // Phase 1: simulate navigation to OTP verification; no password is retained.
    run(() => {
      if (simulateFailure) { setSimulateFailure(false); setNotice('Unable to create the demo profile. Try again.'); return; }
      preferences.setProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      preferences.setDigest(digestOptIn);
      router.push({ pathname: '/(auth)/verify-otp', params: { mode: 'demo' } });
    });
  };

  const handleTabSwitch = (tab: Tab) => {
    if (tab === 'sign-in') {
      router.replace({ pathname: '/(auth)/sign-in', params: { mode: realAuth ? 'real' : 'demo' } });
    }
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
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader signUp={true} onBack={() => router.canGoBack() ? router.back() : router.replace('/(auth)')} />

          {/* Tab switcher */}
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'sign-up' && styles.tabBtnActive]}
              onPress={() => setActiveTab('sign-up')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'sign-up' }}
            >
              <Text style={[styles.tabText, activeTab === 'sign-up' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === 'sign-in' && styles.tabBtnActive]}
              onPress={() => handleTabSwitch('sign-in')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'sign-in' }}
            >
              <Text style={[styles.tabText, activeTab === 'sign-in' && styles.tabTextActive]}>
                Log In
              </Text>
            </Pressable>
          </View>

          {!realAuth && <AuthNotice>Demo only. Use sample details; no account is created.</AuthNotice>}
          {/* Form card */}
          <View style={styles.formCard}>
            <FormInput
              label="Full Name" accessibilityLabel="Full Name" editable={!loading}
              icon="👤"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <FormInput
              label="Email Address" accessibilityLabel="Email Address" editable={!loading}
              icon="✉️"
              placeholder="you@example.com"
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
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              rightIcon={showPassword ? '🙈' : '👁'}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />
            <Text style={styles.hint}>Use 8–128 characters. We’ll email you a verification code.</Text>
            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <Text style={styles.strengthLabel}>Password length</Text>
                <Text style={[styles.strengthValue, { color: strengthColor }]}>
                  {strengthLabel}
                </Text>
              </View>
            )}
            {password.length > 0 && (
              <View style={styles.strengthBars}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: i <= passwordStrength ? strengthColor : Colors.outlineVariant },
                    ]}
                  />
                ))}
              </View>
            )}

            {!realAuth && <>
            {/* Digest opt-in */}
            <Pressable
              style={styles.checkRow}
              onPress={() => setDigestOptIn((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: digestOptIn }}
            >
              <View style={[styles.checkbox, digestOptIn && styles.checkboxChecked]}>
                {digestOptIn && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkText}>
                <Text style={styles.checkTitle}>Send daily 5:00 PM kitchen digest</Text>
                <Text style={styles.checkSub}>
                  Timely suggestions before perishable items expire
                </Text>
              </View>
            </Pressable>
            </>}

            {!!notice && <AuthNotice>{notice}</AuthNotice>}
            <PrimaryButton
              label="Create Account →"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />

            {DIAGNOSTICS_ENABLED && <>
            {/* Social auth divider */}
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
            </>}
            {!!providerNotice && <AuthNotice>{providerNotice}</AuthNotice>}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.replace({ pathname: '/(auth)/sign-in', params: { mode: realAuth ? 'real' : 'demo' } })}
            >
              Log In
            </Text>
          </Text>
          <Text style={styles.legal}>
            Your kitchen. Your data.{' '}
            <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/settings/privacy')}>Privacy & Data</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  tabText: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  tabTextActive: { color: Colors.primary },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    marginTop: -Spacing.sm,
  },
  strengthLabel: { fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  strengthValue: { fontSize: FontSize.labelMd, fontWeight: FontWeight.bold },
  strengthBars: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  strengthBar: { flex: 1, height: 4, borderRadius: Radius.full },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.onPrimary, fontSize: 13, fontWeight: FontWeight.bold },
  checkText: { flex: 1 },
  checkTitle: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  checkSub: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
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
  legalLink: { color: Colors.primary, textDecorationLine: 'underline' },
  ...authScreenStyles,
});
