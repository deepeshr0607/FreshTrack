import { AppState, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { createReceiptImageCache, receiptCacheSource, receiptImageDirectory } from '@/lib/receiptImageCache';

let cache: ReturnType<typeof createReceiptImageCache> | null = null;
let sequence = 0;
export function nativeReceiptImages() {
  if (Platform.OS === 'web') return null;
  if (!cache) {
    const root = new Directory(Paths.cache, receiptImageDirectory);
    cache = createReceiptImageCache(Paths.cache.uri, {
      list: () => root.exists ? root.list().filter(entry => entry instanceof File).map(entry => entry.uri) : [],
      exists: uri => new File(uri).exists,
      remove: uri => { const file = new File(uri); if (file.exists) file.delete(); },
      transfer: async (source, target, move) => {
        root.create({ intermediates: true, idempotent: true });
        const file = new File(source), destination = new File(target);
        if (move) await file.move(destination, { overwrite: false });
        else await file.copy(destination, { overwrite: false });
      },
      // Randomness is for filename collision avoidance, never credentials/security decisions.
      name: () => `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`,
    });
  }
  return cache;
}
/** Called only for a specific SDK-returned receipt copy, never a directory or Photos asset. */
export function disposeReturnedReceiptCopy(uri: string) {
  if (Platform.OS === 'web' || !receiptCacheSource(Paths.cache.uri, uri) ||
    uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/${receiptImageDirectory}/`)) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* SDK-owned unregistered copies remain subject to OS cache cleanup. */ }
}
/** Recovery is independent of sign-in/network, and live preview/OCR leases survive resume. */
export function bindReceiptImageRecovery() {
  const recover = () => { try { nativeReceiptImages()?.recover(); } catch { /* Capture/privacy controls expose a safe retry. */ } };
  recover();
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') recover(); });
  return () => subscription.remove();
}

export function bindReceiptImageSession(session: {
  getSnapshot(): { checking: boolean; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}) {
  let previous = session.getSnapshot().user?.id || null;
  return session.subscribe(() => {
    const state = session.getSnapshot(), next = state.user?.id || null;
    if (state.checking) return;
    if (!next || previous !== next) {
      try { nativeReceiptImages()?.recover(); } catch { /* Retry on startup/resume or from Privacy. */ }
    }
    previous = next;
  });
}
