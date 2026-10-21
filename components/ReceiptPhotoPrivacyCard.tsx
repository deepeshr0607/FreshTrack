import React, { useCallback, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { nativeReceiptImages } from '@/features/scanner/nativeReceiptImages';
import type { ReceiptImageStatus } from '@/lib/receiptImageCache';
import PrimaryButton from './PrimaryButton';
import { s, SettingsDisclosure, SettingsIcon } from '@/features/settings/SettingsPresentation';
import { ui } from './PrototypeScreen';

/** Real privacy controls and filesystem counts, without receipt paths or content. */
export default function ReceiptPhotoPrivacyCard() {
  const [status, setStatus] = useState<ReceiptImageStatus | null>(null);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    const refresh = () => {
      try { setStatus(nativeReceiptImages()?.status() ?? null); }
      catch { setStatus({ files: null, inUse: 0, failed: true }); }
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, []));
  if (Platform.OS === 'web') return null;
  return <View style={s.card}>
    <View style={s.row}><View style={s.iconTile}><SettingsIcon name="image-outline" /></View><Text style={[s.heading, { flex: 1 }]}>Temporary receipt photos</Text></View>
    <Text style={s.caption}>Clear unused app copies. Your original library photos stay unchanged.</Text>
    <Text style={ui.label} accessibilityLiveRegion="polite">{status?.files === null || !status ? 'Unable to check temporary photos.' : `FreshTrack receipt copies: ${status.files}`}</Text>
    {!!status?.inUse && <Text style={ui.text}>Photos currently in use: {status.inUse}. These copies clear after the scan or image processing finishes.</Text>}
    {!!status?.failed && <Text style={ui.text} accessibilityRole="alert">Some temporary photos could not be checked or cleared. Retry when the device is available.</Text>}
    <PrimaryButton label="Clear Unused Receipt Photos" variant="ghost" onPress={() => {
      try {
        const result = nativeReceiptImages()?.recover();
        if (!result) throw Error('UNAVAILABLE');
        setStatus(result);
        setMessage(result?.failed ? 'Some temporary photos could not be cleared. Retry.'
          : result?.inUse ? 'Unused receipt photos cleared. Photos still in use are preserved.' : 'Unused receipt photos cleared. Original library photos are unchanged.');
      } catch { setMessage('Unable to clear temporary photos. Please retry.'); }
    }} />
    {!!message && <Text style={ui.text} accessibilityLiveRegion="polite">{message}</Text>}
    <SettingsDisclosure title="About temporary photos"><Text style={ui.text}>FreshTrack keeps managed receipt copies only while you review a scan. Unused copies are cleared when the app opens or resumes. Photos in use stay until you clear or leave the scan, or confirm its import.</Text></SettingsDisclosure>
  </View>;
}
