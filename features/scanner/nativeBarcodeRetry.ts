import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createBarcodeRetryStorage } from '@/lib/barcodeEntry';
import { bindReceiptImportSession } from '@/lib/receiptImport';
const stores = new Map<string, ReturnType<typeof createBarcodeRetryStorage>>();
export function nativeBarcodeRetry(subject: string) {
  const scope = JSON.stringify([process.env.EXPO_PUBLIC_NEON_AUTH_URL, subject]);
  if (!stores.has(scope)) stores.set(scope, createBarcodeRetryStorage({
    get: key => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    remove: key => SecureStore.deleteItemAsync(key),
  }, scope));
  return stores.get(scope)!;
}
/** Reuse the existing session-change cleanup contract; no background submission. */
export const bindBarcodeRetryCleanup = (session: Parameters<typeof bindReceiptImportSession>[0]) =>
  Platform.OS === 'web' ? () => undefined : bindReceiptImportSession(session, subject => nativeBarcodeRetry(subject).clear());
