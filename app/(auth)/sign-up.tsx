/**
 * Sign-up screen
 * Design reference: design-reference/freshtrack_account_sign_up_login/screen.png
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

type Tab = 'sign-up' | 'sign-in';

export default function SignUpScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('sign-up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [digestOptIn, setDigestOptIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
      ? 1
      : password.length < 10
      ? 2
      : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][passwordStrength];
  const strengthColor = [Colors.outlineVariant, Colors.criticalRose, Colors.cautionAmber, Colors.freshGreen][passwordStrength];

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    // Phase 1: simulate navigation to OTP verification
    setTimeout(() => {
      setLoading(false);
      router.push('/(auth)/verify-otp' as any);
    }, 800);
  };

  const handleTabSwitch = (tab: Tab) => {
    if (tab === 'sign-in') {
      router.replace('/(auth)/sign-in' as any);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header nav */}
          <View style={styles.navRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← </Text>
            </Pressable>
            <Text style={styles.navTitle}>🌿  Sign Up</Text>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>M</Text>
            </View>
          </View>

          {/* Tagline */}
          <View style={styles.taglinePill}>
            <Text style={styles.taglineText}>🌿 ZERO FOOD WASTE MOVEMENT</Text>
          </View>
          <Text style={styles.headline}>Create Your Account</Text>
          <Text style={styles.subtext}>
            Join 15,000+ smart kitchens cutting grocery bills & food waste.
          </Text>

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

          {/* Form card */}
          <View style={styles.formCard}>
            <FormInput
              label="Full Name"
              icon="👤"
              placeholder="Maya Lin"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <FormInput
              label="Email Address"
              icon="✉️"
              placeholder="maya.kitchen@freshtrack.io"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              rightIcon={email.includes('@') ? '✅' : undefined}
            />
            <FormInput
              label="Password"
              icon="🔒"
              placeholder="••••••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              rightIcon={showPassword ? '🙈' : '👁'}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />
            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <Text style={styles.strengthLabel}>Strength</Text>
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

            <PrimaryButton
              label="Create Account →"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />

            {/* Social auth divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.socialBtn} accessibilityRole="button" accessibilityLabel="Continue with Google">
              <Text style={styles.socialIcon}>🇬</Text>
              <Text style={styles.socialText}>Continue with Google</Text>
            </Pressable>
            <Pressable style={styles.socialBtn} accessibilityRole="button" accessibilityLabel="Continue with Apple">
              <Text style={styles.socialIcon}>🍎</Text>
              <Text style={styles.socialText}>Continue with Apple</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.replace('/(auth)/sign-in' as any)}
            >
              Log In
            </Text>
          </Text>
          <Text style={styles.legal}>
            By continuing, you agree to FreshTrack's{' '}
            <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
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
  checkRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
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
  legal: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  legalLink: { color: Colors.primary, textDecorationLine: 'underline' },
});
