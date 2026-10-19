import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import ReceiptScannerScreen from '@/features/scanner/ReceiptScannerScreen';

/** Legacy diagnostic link stays available only during development. */
export default function OcrCheck() {
  if (!__DEV__) return <PrototypeScreen back={() => router.dismissTo('/(tabs)/scanner')}>
    <Text style={ui.text}>Open Receipt OCR from Scanner to scan a receipt.</Text>
  </PrototypeScreen>;
  return <ReceiptScannerScreen diagnostics />;
}
