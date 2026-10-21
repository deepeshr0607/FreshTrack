import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function SettingsIcon({ name, color = Colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function SettingsHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={`Back from ${title}`} onPress={onBack} style={s.round}><SettingsIcon name="arrow-left" /></Pressable><View style={{ flex: 1 }}><Text style={s.brand}>FreshTrack</Text><Text style={s.caption}>{title}</Text></View><Image source={brandImage} style={s.logo} /></View>;
}
export function SettingsDisclosure({ title, icon = 'information-outline', children }: { title: string; icon?: IconName; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={s.disclosure}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={s.disclosureButton}><SettingsIcon name={icon} size={19} /><Text style={[s.label, { flex: 1 }]}>{title}</Text><SettingsIcon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && <View style={s.disclosureBody}>{children}</View>}</View>;
}
export function SettingsLink({ title, caption, icon, onPress, danger = false }: { title: string; caption: string; icon: IconName; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.link}><View style={[s.iconTile, danger && { backgroundColor: '#FFF0F2' }]}><SettingsIcon name={icon} color={danger ? Colors.error : Colors.primary} /></View><View style={{ flex: 1 }}><Text style={[s.heading, danger && { color: Colors.error }]}>{title}</Text><Text style={s.caption}>{caption}</Text></View><SettingsIcon name="chevron-right" color={danger ? Colors.error : Colors.primary} /></Pressable>;
}
export function SettingsSection({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return <View style={s.card}><View style={s.row}><View style={s.iconTile}><SettingsIcon name={icon} /></View><Text accessibilityRole="header" style={[s.heading, { flex: 1 }]}>{title}</Text></View>{children}</View>;
}
export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, round: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' }, logo: { width: 34, height: 34, borderRadius: 11 }, brand: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.onSurface },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 29, lineHeight: 38, letterSpacing: -0.8, color: Colors.onSurface }, heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 24, color: Colors.onSurface }, body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant }, caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant }, label: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 20, color: Colors.primary },
  card: { borderRadius: 22, padding: 18, gap: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.surfaceContainer }, hero: { borderRadius: 24, backgroundColor: Colors.primary, padding: 20, gap: 14 }, avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#E1F5EB', alignItems: 'center', justifyContent: 'center' }, initials: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, color: Colors.primary }, heroName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 21, lineHeight: 29, color: Colors.white }, heroText: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 20, color: '#E1F5EB' }, heroBadge: { alignSelf: 'flex-start', backgroundColor: '#237F60', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 }, iconTile: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center' }, badge: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#E8F5EE' },
  disclosure: { borderRadius: 16, backgroundColor: Colors.surfaceContainerLow }, disclosureButton: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, disclosureBody: { padding: 14, paddingTop: 0, gap: 12 }, notice: { padding: 14, borderRadius: 16, backgroundColor: '#E8F5EE' },
});
