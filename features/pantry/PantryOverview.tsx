import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function PantryIcon({ name, color = Colors.primary, size = 21 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export default function PantryOverview({ count, value, countLabel, valueLabel, loading, readOnly, onAdd, onScan, onSettings }: {
  count: number; value: string; countLabel: string; valueLabel: string; loading: boolean; readOnly: boolean;
  onAdd(): void; onScan(): void; onSettings(): void;
}) {
  return <>
    <View style={s.header}><View style={s.brand}><Image source={brandImage} style={s.logo} accessibilityIgnoresInvertColors /><View><Text style={s.brandName}>FreshTrack</Text><Text style={s.caption}>Kitchen inventory</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Scan a receipt" onPress={onScan} style={s.settings}><PantryIcon name="receipt" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Pantry settings" onPress={onSettings} style={s.settings}><PantryIcon name="cog-outline" /></Pressable></View>
    <View style={s.titleRow}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.title}>Your pantry<Text style={{ color: Colors.primary }}>.</Text></Text><Text style={s.caption}>{readOnly ? 'Saved groceries · read-only' : 'Know what you have. Use what you love.'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add Item Manually" accessibilityState={{ disabled: readOnly }} disabled={readOnly} onPress={onAdd} style={[s.add, readOnly && { opacity: 0.4 }]}><PantryIcon name="plus" color={Colors.white} /><Text style={s.addText}>Add</Text></Pressable></View>
    <View style={s.overview}>
      <View style={s.metric}><View style={s.metricLabel}><PantryIcon name="fridge-outline" color={Colors.inversePrimary} size={18} /><Text style={s.metricCaption}>{countLabel}</Text></View><Text style={s.metricValue}>{loading ? '…' : count}</Text></View>
      <View style={s.divider} /><View style={s.metric}><View style={s.metricLabel}><PantryIcon name="wallet-outline" color={Colors.inversePrimary} size={18} /><Text style={s.metricCaption}>{valueLabel}</Text></View><Text style={s.money}>{loading ? '…' : value}</Text></View>
    </View>

  </>;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }, logo: { width: 34, height: 34, borderRadius: 11 },
  brandName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.onSurface },
  caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant },
  settings: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 18 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, lineHeight: 39, letterSpacing: -1, color: Colors.onSurface },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 46, paddingHorizontal: 16, borderRadius: 999, backgroundColor: Colors.primary },
  addText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.white },
  overview: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.primary, padding: 18, borderRadius: 22, gap: 16, marginBottom: 14 },
  metric: { flex: 1, minWidth: 96, gap: 9 }, metricLabel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  metricCaption: { color: '#E2F6EB', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, lineHeight: 16 },
  metricValue: { color: Colors.white, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 30, lineHeight: 38, fontVariant: ['tabular-nums'] },
  money: { color: Colors.white, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 23, lineHeight: 38, fontVariant: ['tabular-nums'] },
  divider: { width: 1, backgroundColor: '#408F74' },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F5EE', borderRadius: 18, padding: 14, marginBottom: 20 },
  scanIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  scanTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.primary, marginBottom: 2 },
});
