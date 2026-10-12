import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createPantryDiskCache } from '@/lib/pantryDiskCache';

/** Grocery snapshots only; this namespace is separate from provider session storage. */
export const nativePantryDiskCache = Platform.OS === 'web' ? null : createPantryDiskCache({
  get: key => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  remove: key => SecureStore.deleteItemAsync(key),
});
