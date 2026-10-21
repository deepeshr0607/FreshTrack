import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function ChefIcon({ name, color = Colors.primary, size = 21 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function ChefHeader({ title, onBack, onShopping, onSettings, count = 0 }: { title: string; onBack?: () => void; onShopping?: () => void; onSettings?: () => void; count?: number }) {
  return <View style={c.header}>{onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Back to Recipes" onPress={onBack} style={c.round}><ChefIcon name="arrow-left" /></Pressable> : <Image source={brandImage} style={c.logo} accessibilityIgnoresInvertColors />}
    <View style={{ flex: 1 }}><Text style={c.brand}>FreshTrack</Text><Text style={c.caption}>{title}</Text></View>
    {onShopping && <Pressable accessibilityRole="button" accessibilityLabel="Open Shopping List" onPress={onShopping} style={c.round}><ChefIcon name="basket-outline" />{count > 0 && <Text style={c.badge}>{count}</Text>}</Pressable>}
    {onSettings && <Pressable accessibilityRole="button" accessibilityLabel="Recipe settings" onPress={onSettings} style={c.round}><ChefIcon name="cog-outline" /></Pressable>}</View>;
}
export function ChefDisclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={c.disclosure}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={c.disclosureButton}><ChefIcon name="tune-variant" size={18} /><Text style={[c.label, { flex: 1 }]}>{title}</Text><ChefIcon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && <View style={c.disclosureBody}>{children}</View>}</View>;
}
export function ChefSection({ title, caption }: { title: string; caption?: string }) {
  return <View style={{ gap: 4 }}><Text accessibilityRole="header" style={c.sectionTitle}>{title}</Text>{caption && <Text style={c.caption}>{caption}</Text>}</View>;
}
export const c = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }, logo: { width: 34, height: 34, borderRadius: 11 }, brand: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.onSurface },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: Colors.primary, color: Colors.white, fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.onSurface, fontSize: 28, lineHeight: 36, letterSpacing: -0.8 }, body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant }, caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant },
  label: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 19, color: Colors.primary }, sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, lineHeight: 26, color: Colors.onSurface },
  card: { backgroundColor: Colors.white, padding: 18, borderRadius: 22, gap: 12, borderWidth: 1, borderColor: Colors.surfaceContainer }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  hero: { backgroundColor: Colors.primary, borderRadius: 24, padding: 20, gap: 12 }, whiteTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 29, lineHeight: 37, letterSpacing: -0.8, color: Colors.white }, whiteBody: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: '#E1F5EB' }, eyebrow: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 1.4, color: Colors.inversePrimary },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  search: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 52, backgroundColor: Colors.white, borderRadius: 18, gap: 9 }, input: { flex: 1, minWidth: 0, paddingVertical: 14, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurface, fontSize: 13 },
  pill: { minHeight: 44, borderRadius: 999, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' }, selected: { backgroundColor: Colors.primary }, whiteLabel: { color: Colors.white },
  rescuePill: { minHeight: 44, padding: 12, borderRadius: 16, backgroundColor: '#FFF4DF', gap: 3 }, ingredientName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: Colors.secondary },
  disclosure: { borderRadius: 16, backgroundColor: Colors.surfaceContainerLow }, disclosureButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, padding: 12 }, disclosureBody: { padding: 14, paddingTop: 0, gap: 12 },
  empty: { backgroundColor: Colors.white, borderRadius: 22, padding: 24, gap: 12, alignItems: 'center' },
  featured: { backgroundColor: Colors.white, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceContainer }, imageWrap: { position: 'relative' }, imageBadge: { position: 'absolute', top: 14, left: 14, borderRadius: 999, backgroundColor: Colors.white, paddingVertical: 7, paddingHorizontal: 10 }, save: { position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' }, featuredBody: { padding: 18, gap: 12 }, recipeTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, lineHeight: 29, color: Colors.onSurface, letterSpacing: -0.4 }, tag: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, lineHeight: 17, color: Colors.primary, backgroundColor: '#EAF6EF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  compact: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: Colors.surfaceContainer }, thumb: { width: 76 }, compactTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, lineHeight: 21, color: Colors.onSurface },
  ingredient: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow }, ingredientStatus: { flexDirection: 'row', gap: 7, alignItems: 'center' }, checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, padding: 14, borderRadius: 16, backgroundColor: Colors.surfaceContainerLow },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, stepNumber: { minWidth: 28, minHeight: 28, textAlign: 'center', paddingTop: 4, borderRadius: 14, backgroundColor: '#E5F5EC', color: Colors.primary, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, padding: 12, flex: 1, minWidth: 100, gap: 4 }, metricValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, color: Colors.primary, lineHeight: 29 },
  progressTrack: { height: 5, backgroundColor: '#337F64', borderRadius: 3, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: Colors.inversePrimary, borderRadius: 3 },
});
