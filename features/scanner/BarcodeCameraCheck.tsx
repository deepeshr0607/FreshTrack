import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenHeader from '@/components/ScreenHeader';
import FormInput from '@/components/FormInput';
import { Colors } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { createBarcodeLatch, packageBarcode } from '@/lib/packageBarcode';

/** Shared single-code camera: diagnostic by default; normal mode opens reviewed catalog entry. No image capture. */
export default function BarcodeCameraCheck({ lookupMode = false }: { lookupMode?: boolean }) {
  const { state: auth } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const latch = useRef(createBarcodeLatch()).current;
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [typedCode, setTypedCode] = useState('');
  const [message, setMessage] = useState('');
  const identity = auth.user?.id;
  const allowed = (lookupMode || __DEV__) && !!auth.user && !auth.demo && !auth.checking;
  const generation = useRef(0);
  const permitted = useRef(allowed);
  permitted.current = allowed;
  function stop() { generation.current++; latch.stop(); setScanning(false); setTorch(false); }
  useFocusEffect(React.useCallback(() => () => { generation.current++; latch.stop(); setScanning(false); setTorch(false); }, [latch]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => sub.remove();
    // The latch and setters are stable for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latch]);
  useEffect(() => { stop(); setCode(null); setMessage(''); }, [identity, allowed]);

  async function start() {
    const request = ++generation.current;
    setMessage('');
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (request !== generation.current || !permitted.current) return;
      // Permission prompts can trigger session revalidation; explicit retry is safe.
      if (!result.granted) { setMessage('Camera permission denied. You can enter the grocery manually.'); return; }
      if (!allowed || AppState.currentState !== 'active') return;
      setCode(null); latch.arm(); setScanning(true);
    } catch { setMessage('Unable to open camera. Retry or enter the grocery manually.'); }
  }

  return <SafeAreaView style={styles.safe}>
    <ScreenHeader title="FreshTrack" subtitle={lookupMode ? 'Barcode Scanner' : 'Barcode camera check'} showNotification={false} showAvatar={false} />
    <ScrollView contentContainerStyle={styles.content}>
      <PrimaryButton label="Back to Scanner" variant="ghost" onPress={() => { stop(); router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/scanner'); }} />
      <Text style={styles.title}>Scan a packaged grocery</Text>
      <Text style={styles.body}>{lookupMode ? 'Scan one package, look up its product details, then review quantity, purchase value and expiry before saving.' : 'Development camera check · Reads the barcode number only. This diagnostic does not save groceries.'}</Text>
      {!allowed ? <Text style={styles.body}>Use a verified real account in the development app for this check.</Text> : <>
        {Platform.OS === 'web' ? <Text style={styles.body}>Use FreshTrack Dev on your phone for the camera check.</Text> : <>
          {scanning && <View style={styles.preview}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" autofocus="on" enableTorch={torch}
              barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a', 'itf14'] }}
              onMountError={() => { stop(); setMessage('Camera unavailable. Retry or use manual entry.'); }}
              onBarcodeScanned={event => {
                if (!permitted.current) return;
                const accepted = latch.accept(event.data);
                if (!accepted) return;
                setCode(accepted); stop(); setMessage('One barcode captured. Camera stopped.');
              }} />
            <View pointerEvents="none" style={styles.frame} />
          </View>}
          <Text style={styles.body}>Align the package’s EAN/UPC barcode in good light. QR codes are ignored. If nothing is detected, try the torch, move farther away, or enter the item manually.</Text>
          {scanning ? <>
            <PrimaryButton label={torch ? 'Turn Torch Off' : 'Turn Torch On'} variant="secondary" onPress={() => setTorch(v => !v)} />
            <PrimaryButton label="Cancel Scan" variant="ghost" onPress={stop} />
          </> : <PrimaryButton label={code ? 'Scan Another Barcode' : 'Start Camera Scan'} onPress={start} />}
          {permission && !permission.granted && !permission.canAskAgain && <PrimaryButton label="Open Device Settings" variant="ghost" onPress={() => { stop(); void Linking.openSettings().catch(() => setMessage('Open device Settings manually to allow camera access.')); }} />}
        </>}
        {code && <View style={styles.result}><Text style={styles.title}>Barcode captured</Text><Text selectable style={styles.body}>{code}</Text><Text style={styles.body}>This number does not tell us the product name, price or expiry. Review catalog details and supply your purchase information.</Text>
          {lookupMode && <PrimaryButton label="Review Barcode Product" onPress={() => { stop(); router.push({ pathname: '/pantry/add', params: { barcode: code } }); }} />}
          <PrimaryButton label="Clear Barcode" variant="ghost" onPress={() => { setCode(null); setMessage(''); }} /></View>}
        {lookupMode && <>
          <FormInput label="Enter a barcode number instead" accessibilityLabel="Barcode number" value={typedCode} maxLength={14} keyboardType="number-pad" onChangeText={setTypedCode} />
          <PrimaryButton label="Review Entered Barcode" variant="secondary" onPress={() => {
            const entered = packageBarcode(typedCode);
            if (!entered) { setMessage('Enter a valid 8, 12, 13 or 14-digit retail barcode, including its check digit.'); return; }
            stop(); router.push({ pathname: '/pantry/add', params: { barcode: entered } });
          }} />
          <PrimaryButton label="Resume Barcode Save" variant="ghost" onPress={() => { stop(); router.push({ pathname: '/pantry/add', params: { barcodeRetry: '1' } }); }} />
        </>}
        <PrimaryButton label="Enter Item Manually" variant="secondary" onPress={() => { stop(); setCode(null); router.push('/pantry/add'); }} />
      </>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 22, color: Colors.onSurface },
  preview: { height: 300, overflow: 'hidden', borderRadius: 24, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  frame: { width: '82%', height: 130, borderRadius: 16, borderWidth: 3, borderColor: '#10B981' },
  result: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: Colors.freshGreenBg },
});
