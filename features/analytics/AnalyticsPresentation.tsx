import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function AnalyticsIcon({ name, color = Colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function AnalyticsHeader({ financial, onBack, onSettings, onReport, onRefresh, loading }: { financial: boolean; onBack: () => void; onSettings: () => void; onReport?: () => void; onRefresh: () => void; loading: boolean }) {
  return <View style={a.row}>{financial ? <Pressable accessibilityRole="button" accessibilityLabel="Back to Insights" onPress={onBack} style={a.round}><AnalyticsIcon name="arrow-left" /></Pressable> : <Image source={brandImage} style={a.logo} />}
    <View style={{ flex: 1 }}><Text style={a.brand}>FreshTrack</Text><Text style={a.caption}>{financial ? 'Financial record' : 'Your kitchen insights'}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Refresh Analytics" accessibilityState={{ busy: loading, disabled: loading }} disabled={loading} onPress={onRefresh} style={a.round}><AnalyticsIcon name="refresh" /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Preview household analytics report" accessibilityState={{ disabled: !onReport }} disabled={!onReport} onPress={onReport} style={[a.round, !onReport && { opacity: 0.4 }]}><AnalyticsIcon name="export-variant" /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Analytics settings" onPress={onSettings} style={a.round}><AnalyticsIcon name="cog-outline" /></Pressable></View>;
}
export function AnalyticsDisclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={a.disclosure}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={a.disclosureButton}><AnalyticsIcon name="information-outline" size={18} /><Text style={[a.label, { flex: 1 }]}>{title}</Text><AnalyticsIcon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && <View style={a.disclosureBody}>{children}</View>}</View>;
}
export function AnalyticsAction({ title, caption, icon, onPress }: { title: string; caption: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={a.action}><View style={a.iconTile}><AnalyticsIcon name={icon} /></View><View style={{ flex: 1 }}><Text style={a.heading}>{title}</Text><Text style={a.caption}>{caption}</Text></View><AnalyticsIcon name="chevron-right" /></Pressable>;
}
export const a = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 34, height: 34, borderRadius: 11 }, brand: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: Colors.onSurface },
  round: { minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, lineHeight: 39, letterSpacing: -0.8, color: Colors.onSurface }, heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 24, color: Colors.onSurface },
  caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant }, label: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 19, color: Colors.primary },
  card: { backgroundColor: Colors.white, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: Colors.surfaceContainer },
  hero: { backgroundColor: Colors.primary, borderRadius: 24, padding: 22, gap: 14, overflow: 'hidden' }, eyebrow: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 1.4, color: Colors.inversePrimary },
  amount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, lineHeight: 49, letterSpacing: -1, color: Colors.white }, heroText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 20, color: '#E1F5EB' },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heroStat: { flex: 1, minWidth: 100, padding: 12, gap: 4, borderRadius: 15, backgroundColor: '#237F60' }, heroCount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: Colors.white },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { flex: 1, minWidth: 120, backgroundColor: Colors.white, borderRadius: 20, padding: 16, gap: 7 }, metricValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: Colors.onSurface },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceContainer }, iconTile: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' },
  disclosure: { borderRadius: 16, backgroundColor: Colors.surfaceContainerLow }, disclosureButton: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, disclosureBody: { padding: 14, paddingTop: 0, gap: 10 },
});
