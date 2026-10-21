import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { PANTRY_CATEGORIES } from '@/lib/pantry';
import type { LocalReceiptCandidate } from '@/lib/receiptCandidates';
import { receiptExpiryLabel } from '@/lib/receiptCandidates';
import type { receiptProductKind, automaticFreshRule } from '@/lib/receiptProducts';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function ReviewIcon({ name, color = Colors.primary, size = 20 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function ReviewAction({ label, onPress, icon, danger = false, disabled = false, text }: { text?: string; label: string; onPress(): void; icon: IconName; danger?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [r.smallAction, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }]}><ReviewIcon name={icon} color={danger ? Colors.criticalRose : Colors.primary} size={18} /><Text style={[r.actionText, danger && { color: Colors.criticalRose }]}>{text ?? label}</Text></Pressable>;
}
export function ReviewDisclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={r.disclosure}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={r.disclosureButton}><ReviewIcon name="information-outline" size={18} /><Text style={[r.caption, { flex: 1 }]}>{title}</Text><ReviewIcon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && <View style={r.disclosureBody}>{children}</View>}</View>;
}
export function ReviewHeading({ title, subtitle, icon = 'basket-outline' }: { title: string; subtitle: string; icon?: IconName }) {
  return <View style={r.headingRow}><View style={r.headingIcon}><ReviewIcon name={icon} size={25} /></View><View style={{ flex: 1 }}><Text accessibilityRole="header" style={r.title}>{title}</Text><Text style={r.body}>{subtitle}</Text></View></View>;
}
export function ReviewStats({ stats }: { stats: { label: string; value: string | number; warning?: boolean }[] }) {
  return <View style={r.stats}>{stats.map(stat => <View key={stat.label} style={[r.stat, stat.warning && { backgroundColor: '#FFF4DF' }]}><Text style={r.caption}>{stat.label}</Text><Text style={[r.statValue, stat.warning && { color: Colors.secondary }]}>{stat.value}</Text></View>)}</View>;
}
export function ReceiptProductCard({ row, kind, rule, issue, onToggle, onEdit, onRemove, onScan, onGuidance }: {
  row: LocalReceiptCandidate; kind: ReturnType<typeof receiptProductKind>; rule: ReturnType<typeof automaticFreshRule>; issue?: string;
  onToggle(): void; onEdit(): void; onRemove(): void; onScan(): void; onGuidance(): void;
}) {
  return <View style={[r.product, !row.selected && { opacity: 0.6 }, !!issue && row.selected && { borderColor: '#EAC991' }]}>
    <View style={r.productTop}><View style={r.food}><Text style={{ fontSize: 28 }}>{PANTRY_CATEGORIES.find(category => category.name === row.draft.category)?.emoji ?? '🛒'}</Text></View>
      <View style={{ flex: 1 }}><Text style={r.productName}>{row.draft.name}</Text><Text style={r.body}>{row.draft.quantity} {row.draft.unit} · {row.draft.price ? `₹${row.draft.price}` : 'Unknown value'}</Text></View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={`Include ${row.draft.name}`} accessibilityState={{ checked: row.selected }} onPress={onToggle} style={r.check}><ReviewIcon name={row.selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={26} /></Pressable>
    </View>
    <View style={r.pillRow}><Text style={r.kind}>{kind === 'fresh' ? 'Fresh / loose' : kind === 'packaged' ? 'Packaged' : 'Check product type'}</Text><Text style={r.category}>{row.draft.category}</Text></View>
    <View style={[r.expiry, !row.reviewed && { backgroundColor: '#FFF4DF' }]}><ReviewIcon name={row.reviewed ? 'calendar-check-outline' : 'calendar-question'} color={row.reviewed ? Colors.primary : Colors.secondary} size={18} /><Text style={[r.expiryText, !row.reviewed && { color: Colors.secondary }]}>{row.reviewed ? receiptExpiryLabel({ expiresOn: row.draft.expiresOn, expirySelection: row.expirySelection }) : 'Add an expiry date or check details'}</Text></View>
    {kind === 'fresh' && <Text style={r.caption}>No package scan needed</Text>}
    {!!issue && <Text style={r.warning}>{issue}</Text>}
    {rule && <View style={{ gap: 5 }}><Text style={r.caption}>{rule.condition}. Shorten the date if older or stored differently.</Text><Pressable accessibilityRole="link" accessibilityLabel={`Storage guidance for ${row.draft.name}`} onPress={onGuidance} style={r.guidance}><Text style={r.link}>Storage guidance · {rule.source}</Text><ReviewIcon name="open-in-new" size={14} /></Pressable></View>}
    {(row.sourceLineIds?.length ?? 0) > 1 && <Text style={r.caption}>Matched receipt columns · check name and value</Text>}
    <View style={r.cardActions}><ReviewAction label={`Edit ${row.draft.name}`} text="Edit" icon="pencil-outline" onPress={onEdit} /><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${row.draft.name}`} onPress={onRemove} style={r.check}><ReviewIcon name="trash-can-outline" color={Colors.criticalRose} size={19} /></Pressable></View>
    {kind === 'packaged' && <Pressable accessibilityRole="button" accessibilityLabel={`Scan expiry for ${row.draft.name}`} onPress={onScan} style={r.scanButton}><ReviewIcon name="camera-outline" size={18} /><Text style={r.actionText}>{row.expirySelection?.packageDate ? 'Rescan expiry tag' : 'Scan expiry tag'}</Text><ReviewIcon name="arrow-right" size={18} /></Pressable>}
  </View>;
}
export const r = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: Colors.surfaceContainer },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headingIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E5F5EC', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, lineHeight: 32, color: Colors.onSurface, letterSpacing: -0.6 }, body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant },
  caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { flex: 1, minWidth: 70, backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 12, gap: 5 }, statValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: Colors.primary, fontVariant: ['tabular-nums'] },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Colors.surfaceContainerLow, flexShrink: 1 }, actionText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 18, color: Colors.primary, flexShrink: 1 },
  disclosure: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 16 }, disclosureButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, minHeight: 46 }, disclosureBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  product: { backgroundColor: Colors.white, borderRadius: 22, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.surfaceContainer }, productTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, food: { width: 44, height: 48, backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, productName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 23, color: Colors.onSurface }, check: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, kind: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, lineHeight: 18, color: Colors.primary, backgroundColor: '#E6F5ED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }, category: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAF6EF', borderRadius: 12, padding: 10 }, expiryText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 19, color: Colors.primary }, warning: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 19, color: Colors.secondary },
  guidance: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, link: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, lineHeight: 17, color: Colors.primary }, cardActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow, paddingTop: 8 }, scanButton: { minHeight: 44, borderRadius: 999, backgroundColor: Colors.surfaceContainerLow, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 24, color: Colors.onSurface }, section: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceContainer }, fieldsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, field: { flex: 1, minWidth: 100 },
  compactRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  success: { backgroundColor: '#E5F5EC', borderRadius: 22, padding: 24, alignItems: 'center', gap: 12 },
  info: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, padding: 12, gap: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { flex: 1, minWidth: 110, minHeight: 46, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center', padding: 10 }, selectedChoice: { backgroundColor: Colors.primary, borderColor: Colors.primary }, choiceText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 19, color: Colors.primary },
});
