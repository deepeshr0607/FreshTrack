import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createReceiptImportStorage, receiptImportScope, bindReceiptImportSession } from '@/lib/receiptImport';
const stores = new Map<string, ReturnType<typeof createReceiptImportStorage>>();
export function nativeReceiptImportStorage(subject: string) {
  const scope = receiptImportScope(process.env.EXPO_PUBLIC_NEON_AUTH_URL, subject);
  if (!stores.has(scope)) stores.set(scope, createReceiptImportStorage({
    get: key => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    remove: key => SecureStore.deleteItemAsync(key),
  }, scope));
  return stores.get(scope)!;
}
/** Invalidate pending local writes synchronously on sign-out; never send during cleanup. */
export function bindReceiptImportCleanup(session: {
  getSnapshot(): { checking: boolean; status: string; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}) {
  if (Platform.OS === 'web') return () => undefined;
  return bindReceiptImportSession(session, subject => nativeReceiptImportStorage(subject).clear());
}
