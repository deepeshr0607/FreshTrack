import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Elevation, FontSize, Radius, Spacing } from '@/constants/Theme';

export const ui = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.md, ...Elevation.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.onSurface, fontSize: FontSize.headlineMd },
  heading: { fontFamily: 'PlusJakartaSans_700Bold', color: Colors.onSurface, fontSize: FontSize.headlineSm },
  text: { fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurfaceVariant, fontSize: FontSize.bodyMd, lineHeight: 21 },
  label: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary, fontSize: FontSize.labelMd },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  pill: { borderRadius: Radius.full, backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44, justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: Radius.full, padding: 4, backgroundColor: Colors.surfaceContainerHigh },
  active: { backgroundColor: Colors.white },
  large: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.onSurface, fontSize: FontSize.displayLg, fontVariant: ['tabular-nums'] },
});

export default function PrototypeScreen({ children, header, back }: {
  children: React.ReactNode; header?: React.ReactNode; back?: () => void;
}) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
    {header}
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.base,
        gap: Spacing.base, paddingBottom: Spacing.navClearance + Spacing.xl, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
        {back && <Pressable onPress={back} accessibilityRole="button" style={ui.pill}><Text style={ui.label}>← Back</Text></Pressable>}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function backToRecipes() { router.dismissTo('/(tabs)/recipes'); }

export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress}
    style={[ui.pill, { flex: 1, alignItems: 'center' }, selected && ui.active]}>
    <Text style={ui.label}>{label}</Text>
  </Pressable>;
}
