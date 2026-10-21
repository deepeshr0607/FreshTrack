import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
function Icon({ name, color = Colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
function Tap({ label, onPress, children, style, disabled = false }: { label: string; onPress(): void; children: React.ReactNode; style?: React.ComponentProps<typeof Pressable>['style']; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={state => [typeof style === 'function' ? style(state) : style, disabled && { opacity: 0.45 }, state.pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>{children}</Pressable>;
}
export function ScannerHeader({ onBack, onSettings }: { onBack?: () => void; onSettings?: () => void }) {
  return <View style={s.header}>{onBack ? <Tap label="Back to Scanner" onPress={onBack} style={s.round}><Icon name="arrow-left" /></Tap> : <Image source={brandImage} style={s.logo} accessibilityIgnoresInvertColors />}
    <View style={{ flex: 1 }}><Text style={s.brand}>FreshTrack</Text><Text style={s.caption}>{onBack ? 'Receipt scan' : 'Your groceries, simplified'}</Text></View>
    {onSettings && <Tap label="Scanner settings" onPress={onSettings} style={s.round}><Icon name="cog-outline" /></Tap>}</View>;
}
export function ScannerLanding({ onReceipt, onManual, onBarcode }: { onReceipt(): void; onManual(): void; onBarcode(): void }) {
  const [help, setHelp] = useState(false);
  return <>
    <Text accessibilityRole="header" style={s.pageTitle}>A fresh way<Text style={{ color: Colors.primary }}>{'\n'}to stock up.</Text></Text>
    <Text style={s.subtitle}>From grocery bag to organised pantry.</Text>
    <View style={s.hero}>
      <View style={s.heroTop}><Text style={s.eyebrow}>START WITH YOUR RECEIPT</Text><Icon name="receipt" color={Colors.inversePrimary} /></View>
      <View style={s.illustration} accessible={false}>
        <View style={s.frame}><View style={s.paper}><View style={s.paperHeading}><Icon name="leaf" size={19} /><View style={[s.line, { width: 40 }]} /></View>{[1, 2, 3].map(i => <View key={i} style={s.paperRow}><View style={s.line} /><View style={[s.line, { width: 20 }]} /></View>)}<View style={s.paperBottom}><Icon name="check-circle" size={27} /></View></View><View style={s.scanLine} /></View>
        <View style={s.floatBadge}><Icon name="basket-outline" size={18} /><Text style={s.badgeText}>Scan · Review · Add</Text></View>
      </View>
      <Text style={s.heroTitle}>One receipt.{'\n'}Your whole grocery haul.</Text>
      <Text style={s.heroBody}>Take a photo or upload one. We’ll read the items so you can review and save.</Text>
      <Tap label="Scan receipt" onPress={onReceipt} style={s.heroButton}><Icon name="camera-outline" /><Text style={s.heroButtonText}>Scan or upload receipt</Text><Icon name="arrow-right" size={19} /></Tap>
    </View>
    <View style={s.stepRow}>{['Capture', 'Review', 'Add to pantry'].map((label, index) => <View key={label} style={s.step}><Text style={s.stepNumber}>0{index + 1}</Text><Text style={s.stepText}>{label}</Text></View>)}</View>
    <Text style={s.sectionTitle}>Other ways to add</Text>
    <View style={s.alternatives}>
      <Tap label="Enter Item Manually" onPress={onManual} style={s.alternative}><View style={s.tileIcon}><Icon name="pencil-outline" /></View><Text style={s.tileTitle}>Add manually</Text><Text style={s.caption}>Just a few items?</Text><Icon name="arrow-top-right" size={18} /></Tap>
      <Tap label="Scan barcode" onPress={onBarcode} style={s.alternative}><View style={[s.tileIcon, { backgroundColor: Colors.surfaceContainerLow }]}><Icon name="barcode-scan" /></View><Text style={s.tileTitle}>Barcode</Text><Text style={s.caption}>One packaged item</Text><Icon name="arrow-top-right" size={18} /></Tap>
    </View>
    <View style={s.help}>
      <Pressable accessibilityRole="button" accessibilityLabel="How receipt scanning works" accessibilityState={{ expanded: help }} onPress={() => setHelp(value => !value)} style={s.helpToggle}><Icon name="information-outline" size={19} /><Text style={s.helpTitle}>What happens after scanning?</Text><Icon name={help ? 'chevron-up' : 'chevron-down'} size={19} /></Pressable>
      {help && <View style={s.helpContent}><Text style={s.body}>Review each product. Supported fresh foods get editable expiry estimates. For packaged items, scan the printed expiry tag or enter a date.</Text><Text style={s.body}>Correct anything the scan missed. Nothing goes into Pantry until you confirm.</Text></View>}
    </View>
    <View style={s.privacy}><Icon name="shield-check-outline" size={16} /><Text style={s.privacyText}>Receipt photos are read on your device.</Text></View>
  </>;
}
export function ReceiptProgress({ step }: { step: 1 | 2 | 3 }) {
  return <View style={s.progress}>{['Capture', 'Review', 'Add'].map((label, index) => <View key={label} style={s.progressStep}><View style={[s.progressDot, index + 1 <= step && { backgroundColor: Colors.primary }]}><Text style={[s.progressNumber, index + 1 <= step && { color: Colors.white }]}>{index + 1}</Text></View><Text style={[s.stepText, index + 1 === step && { color: Colors.primary }]}>{label}</Text></View>)}</View>;
}
export function ReceiptCapturePanel({ image, busy, supported, read, onCamera, onLibrary }: { image: string | null; busy: boolean; supported: boolean; read: boolean; onCamera(): void; onLibrary(): void }) {
  return <View style={s.capturePanel}>
    {!read && <View style={{ gap: 6 }}><Text accessibilityRole="header" style={s.captureTitle}>Let’s read your receipt.</Text><Text style={s.body}>Lay it flat, keep every item in view, and use good light.</Text></View>}
    <View style={s.viewfinder}>
      {image ? <Image source={{ uri: image }} accessibilityLabel="Selected receipt preview" resizeMode="contain" style={s.preview} /> : <View style={s.placeholder}><Icon name="receipt" size={76} color={Colors.inversePrimary} /><Text style={s.viewfinderText}>Your next pantry update starts here</Text></View>}
      {!image && <><View style={[s.corner, s.topLeft]} /><View style={[s.corner, s.topRight]} /><View style={[s.corner, s.bottomLeft]} /><View style={[s.corner, s.bottomRight]} /></>}
      {busy && <View style={s.busy} accessibilityRole="progressbar" accessibilityLabel="Reading receipt"><ActivityIndicator color={Colors.white} /><Text style={s.busyText}>Reading your receipt…</Text></View>}
    </View>
    <View style={s.captureActions}>
      <Tap label={image ? 'Retake Receipt' : 'Photograph Receipt'} onPress={onCamera} disabled={!supported || busy} style={s.cameraButton}><Icon name="camera-outline" color={Colors.white} size={21} /><Text style={s.whiteLabel}>{image ? 'Retake' : 'Take photo'}</Text></Tap>
      <Tap label="Upload Receipt Photo" onPress={onLibrary} disabled={!supported || busy} style={s.uploadButton}><Icon name="image-outline" size={21} /><Text style={s.greenLabel}>Upload photo</Text></Tap>
    </View>
    {!read && <View style={s.privacy}><Icon name="shield-check-outline" size={15} /><Text style={s.privacyText}>Only reviewed products are sent when you confirm.</Text></View>}
  </View>;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 }, logo: { width: 34, height: 34, borderRadius: 11 },
  brand: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.onSurface }, caption: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 17, color: Colors.onSurfaceVariant },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32, lineHeight: 40, letterSpacing: -1, color: Colors.onSurface },
  subtitle: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant, marginTop: 7, marginBottom: 20 },
  hero: { backgroundColor: Colors.primary, borderRadius: 26, padding: 20, gap: 12 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  eyebrow: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, letterSpacing: 1.3, color: Colors.inversePrimary, flex: 1 },
  illustration: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 }, frame: { width: 170, height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#197F5B' },
  paper: { width: 105, height: 128, borderRadius: 12, padding: 14, gap: 12, backgroundColor: '#F2FFF7', transform: [{ rotate: '8deg' }] },
  paperHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, line: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#B1D6C0' },
  paperRow: { flexDirection: 'row', gap: 8, alignItems: 'center' }, paperBottom: { alignItems: 'center' },
  scanLine: { position: 'absolute', height: 2, left: 7, right: 7, top: 72, backgroundColor: Colors.inversePrimary },
  floatBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: Colors.white, marginTop: -5 },
  badgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: Colors.primary },
  heroTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 25, lineHeight: 33, letterSpacing: -0.6, color: Colors.white },
  heroBody: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 20, color: '#E2F6EB' },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: Colors.white, padding: 14, borderRadius: 999, minHeight: 52, marginTop: 4 },
  heroButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.primary },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingVertical: 20 }, step: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepNumber: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: Colors.primary }, stepText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: Colors.onSurfaceVariant },
  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: Colors.onSurface, marginBottom: 12 }, alternatives: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  alternative: { flex: 1, backgroundColor: Colors.white, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceContainer, padding: 16, gap: 7 },
  tileIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }, tileTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: Colors.onSurface },
  help: { borderRadius: 16, backgroundColor: Colors.surfaceContainerLow }, helpToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, minHeight: 48 }, helpTitle: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, lineHeight: 18, color: Colors.onSurfaceVariant }, helpContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, lineHeight: 21, color: Colors.onSurfaceVariant },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 }, privacyText: { flexShrink: 1, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 10, lineHeight: 17, color: Colors.onSurfaceVariant },
  progress: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingVertical: 8 }, progressStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressDot: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: Colors.surfaceContainer }, progressNumber: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: Colors.onSurfaceVariant },
  capturePanel: { gap: 14 }, captureTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 25, lineHeight: 33, color: Colors.onSurface, letterSpacing: -0.5 },
  viewfinder: { height: 220, backgroundColor: '#163C30', borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, preview: { height: '100%', width: '100%' }, placeholder: { alignItems: 'center', gap: 18, padding: 30 },
  viewfinderText: { color: '#D1EFDF', fontSize: 11, lineHeight: 19, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.inversePrimary }, topLeft: { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3 }, topRight: { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3 }, bottomLeft: { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3 }, bottomRight: { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3 },
  busy: { position: 'absolute', inset: 0, backgroundColor: '#163C30DD', alignItems: 'center', justifyContent: 'center', gap: 14 }, busyText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: Colors.white },
  captureActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, cameraButton: { flex: 1, minWidth: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.primary, borderRadius: 999, padding: 14, minHeight: 52 }, uploadButton: { flex: 1, minWidth: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.surfaceContainerLow, borderRadius: 999, padding: 14, minHeight: 52 },
  whiteLabel: { color: Colors.white, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 }, greenLabel: { color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
});
