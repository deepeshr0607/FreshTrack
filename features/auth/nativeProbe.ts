import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createNeonAuth } from '@/lib/neonAuth';
import { createNativeSessionStorage } from '@/lib/nativeSessionStorage';

// The Auth endpoint is public configuration. Database credentials never enter the mobile bundle.
const baseUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const storageKey = `freshtrack.neon.cookie.v1.${(baseUrl || '').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
function initializeProbe() {
  if (Platform.OS === 'web' || !baseUrl) return null;
  try {
    return createNeonAuth(baseUrl, createNativeSessionStorage({
      get: () => SecureStore.getItemAsync(storageKey),
      set: (cookie) => SecureStore.setItemAsync(storageKey, cookie, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
      clear: () => SecureStore.deleteItemAsync(storageKey),
    }), fetch, process.env.EXPO_PUBLIC_NEON_AUTH_ORIGIN);
  } catch { return null; } // Invalid local configuration must not break the existing prototype.
}
export const nativeAuthProbe = initializeProbe();
