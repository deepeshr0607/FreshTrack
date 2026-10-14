import * as SecureStore from 'expo-secure-store';
import { notificationOutboxKey } from '@/lib/notificationOutbox';

export function notificationOutboxStorage(scope: string) {
  const key = notificationOutboxKey(scope);
  return { read: () => SecureStore.getItemAsync(key),
    write: (raw: string) => SecureStore.setItemAsync(key, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }) };
}
