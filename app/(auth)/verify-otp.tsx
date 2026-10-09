/**
 * OTP Verification screen
 * Design reference: freshtrack_account_sign_up_login — six-digit OTP step
 * Note: The supplied designs show the sign-up/login forms; the OTP screen
 * is described in the product spec as a six-digit email verification step.
 * This screen follows the spec and design language.
 */
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      Alert.alert('Incomplete code', 'Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    // Phase 1: simulate OTP success → navigate to app
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)/');
    }, 800);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    Alert.alert('Code resent', 'A new verification code has been sent to your email.');
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(interval); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Back */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Text style={styles.icon}>📧</Text>
          </View>

          <Text style={styles.headline}>Verify Your Email</Text>
          <Text style={styles.subtext}>
            We've sent a 6-digit verification code to your email address. Enter it below to
            continue.
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
                maxLength={1}
                selectTextOnFocus
                accessibilityLabel={`OTP digit ${i + 1}`}
                textAlign="center"
              />
            ))}
          </View>

          <PrimaryButton
            label="Verify & Continue →"
            onPress={handleVerify}
            loading={loading}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive it? </Text>
            <Pressable
              onPress={handleResend}
              disabled={resendCooldown > 0}
              accessibilityRole="button"
            >
              <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.note}>
            ⚠️ Phase 1 only: No real authentication. Tapping Verify navigates directly to
            the app.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: {
    flex: 1,
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
  },
  otpInput: {
    width: 48,
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
