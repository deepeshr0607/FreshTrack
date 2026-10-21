import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/**
 * Welcome / Landing screen
 * Design reference: design-reference/freshtrack_welcome_get_started_centered_hero/screen.png
 */
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';

export default function WelcomeScreen() {
  const { session, state, allowDemo } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero illustration placeholder */}
        <View style={styles.heroBox}>
          <Text style={styles.heroEmoji}>🌿</Text>
          <View style={styles.smartAiBadge}>
            <Text style={styles.smartAiText}>SMART AI</Text>
          </View>
        </View>

        {/* Brand */}
        <Text style={styles.brandName}>FreshTrack•</Text>

        <View style={styles.taglinePill}>
          <Text style={styles.taglineText}>🌿 ZERO-WASTE KITCHEN ASSISTANT</Text>
        </View>

        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>
            <Text style={styles.boldGreen}>$1.2M+ saved</Text> across 15,000+ kitchens
          </Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Stop wasting food.{'\n'}
          <Text style={styles.headlineGreen}>Start saving money.</Text>
        </Text>

        <Text style={styles.subtext}>
          Track expiration dates effortlessly, scan receipts in seconds, and whip up
          delicious meals before your groceries spoil.
        </Text>

        {/* Feature chips */}
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>📷 1-Tap OCR</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>🍽 Smart Recipes</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>🌍 Eco Impact</Text>
          </View>
        </View>

        {/* CTA buttons */}
        <Pressable
          style={({ pressed }) => [styles.getStartedBtn, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/sign-up')}
          accessibilityRole="button"
          accessibilityLabel="Get Started"
        >
          <Text style={styles.getStartedText}>Get Started →</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="Log In"
        >
          <Text style={styles.loginText}>
            I already have an account — <Text style={styles.loginLink}>Log In</Text>
          </Text>
        </Pressable>

        {DIAGNOSTICS_ENABLED && <Pressable onPress={() => router.push('/(auth)/native-check')} accessibilityRole="button">
          <Text style={styles.loginLink}>Test Real Email Sign-In</Text>
        </Pressable>}

        {allowDemo && <Pressable onPress={() => session.enterDemo()} accessibilityRole="button">
          <Text style={styles.loginLink}>Preview Demo Kitchen</Text>
        </Pressable>}

        {state.status === 'error' && <View>
          <Text style={styles.subtext} accessibilityLiveRegion="polite">{state.error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void session.refresh().catch(() => undefined)}>
            <Text style={styles.loginLink}>Retry Session Check</Text>
          </Pressable>
        </View>}

        {/* Legal */}
        <Text style={styles.legal}>
          Learn how FreshTrack handles your data.{' '}
          <Text style={styles.legalLink} accessibilityRole="link" onPress={() => router.push('/settings/privacy')}>Privacy & Data</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.xl2,
    gap: Spacing.base,
  },
  heroBox: {
    width: 200,
    height: 200,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  heroEmoji: { fontSize: 80 },
  smartAiBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  smartAiText: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  brandName: {
    fontSize: 36,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.onSurface,
    letterSpacing: -0.5,
    marginTop: Spacing.sm,
  },
  taglinePill: {
    backgroundColor: Colors.freshGreenBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  taglineText: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  socialProof: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  socialProofText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  boldGreen: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headline: {
    fontSize: FontSize.displayLg,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.onSurface,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  headlineGreen: {
    color: Colors.primary,
  },
  subtext: {
    fontSize: FontSize.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  chipText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  getStartedText: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  loginBtn: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  loginText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  legal: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  legalLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
