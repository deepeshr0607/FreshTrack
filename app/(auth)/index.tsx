import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/** Welcome / Landing screen
 * Design reference: design-reference/freshtrack_welcome_get_started_centered_hero/screen.png
 */
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import PrimaryButton from '@/components/PrimaryButton';
import { AuthIcon, AuthNotice } from '@/features/auth/AuthPresentation';
import { Colors } from '@/constants/Theme';
import { brandImage, recipeImages } from '@/lib/designAssets';

const features = [
  { label: 'Scan', icon: 'receipt', eyebrow: 'LESS TYPING. MORE LIVING.', title: 'Your groceries,\nalready organised.', body: 'Scan or upload a receipt. Review your items, then add them to your pantry.', badge: 'Scan · Review · Save', image: false },
  { label: 'Track', icon: 'fridge-outline', eyebrow: 'MAKE FRESHNESS A HABIT.', title: 'A little reminder.\nA lot less waste.', body: 'Keep expiry dates in view and choose when you want a reminder.', badge: 'Know what to use next', image: false },
  { label: 'Cook', icon: 'silverware-fork-knife', eyebrow: 'PANTRY TO PLATE.', title: 'Good food starts\nwith what you have.', body: 'Find recipe inspiration around the ingredients already in your kitchen.', badge: 'Find your next meal', image: true },
] as const;
export default function WelcomeScreen() {
  const { session, state, allowDemo } = useAuth();
  const [selected, setSelected] = useState(0);
  const feature = features[selected];
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.brand}><Image source={brandImage} style={styles.logo} accessibilityIgnoresInvertColors /><Text style={styles.brandName}>FreshTrack<Text style={{ color: Colors.primary }}>.</Text></Text></View>
      <View style={styles.hero}>
        <View style={styles.orb} pointerEvents="none" />
        <View style={styles.heroTop}><Text style={styles.eyebrow}>YOUR EVERYDAY KITCHEN COMPANION</Text><AuthIcon name="leaf" color={Colors.inversePrimary} /></View>
        <View style={styles.art}>
          {feature.image ? <Image source={recipeImages.rigatoni} style={styles.meal} accessibilityLabel="Pasta meal inspiration" /> : <View style={styles.illustration}>
            <View style={styles.produce}><Text style={styles.food}>{selected === 0 ? '🥬' : '🥑'}</Text></View>
            <View style={styles.receipt}><AuthIcon name={selected === 0 ? 'receipt' : 'bell-ring-outline'} size={34} /><View style={styles.line} /><View style={[styles.line, { width: 42 }]} /><AuthIcon name="check-circle" size={24} /></View>
          </View>}
          <View style={styles.badge}><AuthIcon name="check-circle" size={16} /><Text style={styles.badgeText}>{feature.badge}</Text></View>
        </View>
        <Text style={styles.heroTitle} accessibilityLiveRegion="polite">{feature.title}</Text>
        <Text style={styles.heroBody}>{feature.body}</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.features}>{features.map((item, index) => <Pressable key={item.label} onPress={() => setSelected(index)} accessibilityRole="tab" accessibilityLabel={`Preview ${item.label.toLowerCase()}`} accessibilityState={{ selected: index === selected }} style={[styles.feature, index === selected && styles.featureActive]}>
        <AuthIcon name={item.icon} size={21} color={index === selected ? Colors.primary : Colors.onSurfaceVariant} /><Text style={[styles.featureText, index === selected && { color: Colors.primary }]}>{item.label}</Text>
      </Pressable>)}</View>
      <View style={styles.message}><Text style={styles.messageTitle}>Buy mindfully. Eat happily.</Text><Text style={styles.subtext}>Less food forgotten. More food enjoyed.</Text></View>
      <PrimaryButton label="Get Started →" onPress={() => router.push('/(auth)/sign-up')} style={{ minHeight: 56 }} />
      <Pressable style={styles.loginBtn} onPress={() => router.push('/(auth)/sign-in')} accessibilityRole="button" accessibilityLabel="Log In"><Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Log In</Text></Text></Pressable>
        {DIAGNOSTICS_ENABLED && <Pressable onPress={() => router.push('/(auth)/native-check')} accessibilityRole="button">
          <Text style={styles.loginLink}>Test Real Email Sign-In</Text>
        </Pressable>}

        {allowDemo && <Pressable onPress={() => session.enterDemo()} accessibilityRole="button">
          <Text style={styles.loginLink}>Preview Demo Kitchen</Text>
        </Pressable>}

        {state.status === 'error' && <View style={{ gap: 8 }}>
          <AuthNotice>{state.error}</AuthNotice>
          <PrimaryButton label="Retry Session Check" onPress={() => void session.refresh().catch(() => undefined)} variant="ghost" />
        </View>}


      <Pressable onPress={() => router.push('/settings/privacy')} accessibilityRole="link" style={styles.privacy}><AuthIcon name="shield-check-outline" size={15} color={Colors.onSurfaceVariant} /><Text style={styles.legal}>Your kitchen. Your data. Privacy & Data</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 8 },
  logo: { width: 36, height: 36, borderRadius: 12 }, brandName: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.onSurface, letterSpacing: -0.8 },
  hero: { backgroundColor: Colors.primary, borderRadius: 28, padding: 22, overflow: 'hidden', gap: 12 },
  orb: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#167B58', top: 26, right: -90 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { flex: 1, fontSize: 9, letterSpacing: 1.5, color: Colors.inversePrimary, fontFamily: 'PlusJakartaSans_700Bold' },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 170, marginVertical: 4 },
  illustration: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingBottom: 14 },
  produce: { width: 124, height: 124, borderRadius: 62, backgroundColor: '#218562', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  food: { fontSize: 76 }, receipt: { width: 104, minHeight: 136, padding: 14, gap: 10, backgroundColor: '#F3FFF8', borderRadius: 14, alignItems: 'center', transform: [{ rotate: '10deg' }], marginLeft: -10 },
  line: { width: 64, height: 5, borderRadius: 3, backgroundColor: '#C7E4D6' },
  meal: { width: '100%', height: 170, borderRadius: 18 },
  badge: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: Colors.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, marginTop: -10 },
  badgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.primary },
  heroTitle: { fontSize: 30, lineHeight: 37, letterSpacing: -1, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.white },
  heroBody: { fontSize: 13, lineHeight: 21, fontFamily: 'PlusJakartaSans_400Regular', color: '#E2F6EB' },
  features: { flexDirection: 'row', padding: 5, backgroundColor: Colors.surfaceContainer, borderRadius: 20, gap: 4 },
  feature: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 16 },
  featureActive: { backgroundColor: Colors.white }, featureText: { fontSize: 12, color: Colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold' },
  message: { alignItems: 'center', gap: 5, paddingVertical: 4 }, messageTitle: { fontSize: 18, textAlign: 'center', fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.onSurface },
  subtext: { fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurfaceVariant },
  loginBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: Colors.surfaceContainerLow, padding: 10 },
  loginText: { fontSize: 13, color: Colors.onSurfaceVariant, textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular' },
  loginLink: { color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' }, privacy: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  legal: { fontSize: 10, color: Colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular', flexShrink: 1 },
});
