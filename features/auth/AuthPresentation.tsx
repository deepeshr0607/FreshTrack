import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';
import { brandImage } from '@/lib/designAssets';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
export function AuthIcon({ name, color = Colors.primary, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} accessible={false} />;
}
export function AuthHeader({ signUp, onBack }: { signUp: boolean; onBack(): void }) {
  return <>
    <View style={a.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to welcome" onPress={onBack} style={a.back}><AuthIcon name="arrow-left" /></Pressable>
      <View style={a.brand}><Image source={brandImage} style={a.logo} accessibilityIgnoresInvertColors /><Text style={a.brandText}>FreshTrack</Text></View>
      <View style={{ width: 44 }} />
    </View>
    <View style={a.intro}>
      <View style={a.symbol}><AuthIcon name={signUp ? 'sprout-outline' : 'home-heart'} size={32} /></View>
      <Text style={a.eyebrow}>{signUp ? 'A FRESH START' : 'YOUR KITCHEN AWAITS'}</Text>
      <Text accessibilityRole="header" style={a.title}>{signUp ? 'Less waste.\nMore possibilities.' : 'Good to have\nyou back.'}</Text>
      <Text style={a.body}>{signUp ? 'Create an account. Make the most of every grocery.' : 'Log in and pick up where your kitchen left off.'}</Text>
    </View>
  </>;
}

/** Auth-only fields keep the rest of the app's input styling unchanged. */
export function AuthField({ label, icon, rightIcon, onRightIconPress, ...props }: TextInputProps & {
  label: string; icon?: string; rightIcon?: string; onRightIconPress?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const name: IconName = label === 'Full Name' ? 'account-outline' : label === 'Password' ? 'lock-outline' : 'email-outline';
  return <View style={a.field}>
    <Text style={a.label}>{label}</Text>
    <View style={[a.inputRow, focused && a.focused]}>
      {icon && <AuthIcon name={name} size={20} color={Colors.onSurfaceVariant} />}
      <TextInput {...props} style={a.input} placeholderTextColor={Colors.outline} onFocus={e => { setFocused(true); props.onFocus?.(e); }} onBlur={e => { setFocused(false); props.onBlur?.(e); }} />
      {rightIcon && (onRightIconPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${props.secureTextEntry ? 'Show' : 'Hide'} password`} accessibilityState={{ disabled: props.editable === false }} disabled={props.editable === false} onPress={onRightIconPress} style={a.eye}>
        <AuthIcon name={props.secureTextEntry ? 'eye-outline' : 'eye-off-outline'} size={21} />
      </Pressable> : <AuthIcon name="check-circle-outline" size={20} />)}
    </View>
  </View>;
}
export function AuthNotice({ children }: { children: React.ReactNode }) {
  return <View style={a.notice}><AuthIcon name="information-outline" size={20} /><Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={a.noticeText}>{children}</Text></View>;
}

export const authScreenStyles = StyleSheet.create({
  scroll: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 18 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: Colors.surfaceContainer, borderRadius: 999, padding: 5 },
  tabBtn: { flex: 1, minHeight: 46, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  tabBtnActive: { backgroundColor: Colors.white, boxShadow: '0 2px 6px rgba(19,27,46,0.06)' },
  formCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.surfaceContainer, boxShadow: '0 6px 24px rgba(19,27,46,0.03)' },
  rememberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  forgotText: { fontSize: 12, lineHeight: 20, color: Colors.primary, fontFamily: 'PlusJakartaSans_600SemiBold', paddingVertical: 10 },
  hint: { fontSize: 12, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurfaceVariant, marginTop: -6, marginBottom: 14 },
  legal: { fontSize: 11, lineHeight: 18, textAlign: 'center', color: Colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_400Regular' },
});
const a = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  brand: { flexDirection: 'row', gap: 8, alignItems: 'center' }, logo: { width: 30, height: 30, borderRadius: 10 },
  brandText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: Colors.onSurface },
  intro: { alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 4 },
  symbol: { width: 62, height: 62, backgroundColor: '#E2F6EB', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: 32, lineHeight: 40, letterSpacing: -1, color: Colors.onSurface, textAlign: 'center', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  body: { fontSize: 13, lineHeight: 20, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 290, fontFamily: 'PlusJakartaSans_400Regular' },
  field: { marginBottom: 16 }, label: { fontSize: 12, color: Colors.onSurface, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 2, borderColor: Colors.surfaceContainerLow, paddingLeft: 12, paddingRight: 4, minHeight: 54 },
  focused: { borderColor: Colors.primary, backgroundColor: Colors.white },
  input: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 15, color: Colors.onSurface, fontFamily: 'PlusJakartaSans_400Regular' },
  eye: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.surfaceContainerLow, marginVertical: 8 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurface },
});
