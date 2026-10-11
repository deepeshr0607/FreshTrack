import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { MOCK_CAMERA_PERMISSION_COPY, type MockCameraPermission } from '@/lib/scannerPermission';

/** Shared receipt/barcode gate; demo recovery is local UI, not Linking.openSettings or a camera API. */
export default function CameraPermissionGate({ permission, onChange, children }: {
  permission: MockCameraPermission;
  onChange: (value: MockCameraPermission) => void;
  children: React.ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoAccess, setDemoAccess] = useState(false);
  if (permission === 'granted') return <>{children}</>;

  if (settingsOpen) return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>Demo Camera Settings</Text>
    <Text style={ui.text}>Preview how restoring access returns you to scanning. This control applies only to the prototype and does not open or change iOS or Android settings.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Demo camera access" accessibilityState={{ checked: demoAccess }}
      onPress={() => setDemoAccess((value) => !value)} style={styles.setting}>
      <MaterialCommunityIcons name={demoAccess ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={Colors.primary} />
      <View style={{ flex: 1 }}><Text style={ui.heading}>Demo camera access</Text><Text style={ui.text}>{demoAccess ? 'Allowed in this demo' : 'Blocked in this demo'}</Text></View>
    </Pressable>
    <PrimaryButton label="Save Demo Camera Setting" onPress={() => {
      onChange(demoAccess ? 'granted' : 'blocked'); setSettingsOpen(false);
    }} />
    <PrimaryButton label="Cancel" variant="ghost" onPress={() => setSettingsOpen(false)} />
  </View>;

  const copy = MOCK_CAMERA_PERMISSION_COPY[permission];
  return <View style={ui.card}>
    <View style={styles.icon}>
      <MaterialCommunityIcons name={permission === 'undetermined' ? 'camera-outline' : 'camera-off-outline'} size={34} color={Colors.primary} />
    </View>
    <Text accessibilityRole="header" style={ui.title}>{copy.title}</Text>
    <Text style={ui.text}>{copy.body}</Text>
    {permission === 'undetermined' ? <>
      <PrimaryButton label="Allow Demo Access" onPress={() => onChange('granted')} />
      <PrimaryButton label="Deny Demo Access" variant="ghost" onPress={() => onChange('denied')} />
    </> : permission === 'denied' ?
      <PrimaryButton label="Try Permission Again" onPress={() => onChange('undetermined')} /> :
      <PrimaryButton label="Review Demo Camera Settings" onPress={() => { setDemoAccess(false); setSettingsOpen(true); }} />}
    <PrimaryButton label="Enter Item Manually" variant="ghost" onPress={() => router.push('/pantry/add')} />
  </View>;
}
const styles = StyleSheet.create({
  icon: { width: 64, height: 64, borderRadius: Radius.lg, backgroundColor: Colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  setting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, padding: Spacing.md,
    borderRadius: Radius.lg, backgroundColor: Colors.surfaceContainerLow },
});
