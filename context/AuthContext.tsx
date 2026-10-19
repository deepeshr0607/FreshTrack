import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { createAuthSession } from '@/lib/authSession';
import { bindReceiptImportCleanup } from '@/features/scanner/nativeReceiptImport';
import { bindBarcodeRetryCleanup } from '@/features/scanner/nativeBarcodeRetry';
import { bindPantryCacheCleanup } from '@/lib/pantryDiskCache';
import { nativePantryDiskCache } from '@/features/pantry/nativeDiskCache';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { bindExpiryScheduleSession } from '@/features/notifications/nativeScheduler';

const allowDemo = DIAGNOSTICS_ENABLED;
type Session = ReturnType<typeof createAuthSession>;
const Context = createContext<{ session: Session; state: ReturnType<Session['getSnapshot']>; allowDemo: boolean } | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session] = useState(() => createAuthSession(nativeAuthProbe, allowDemo));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  useEffect(() => {
    const disk = nativePantryDiskCache;
    const stopCacheCleanup = disk ? bindPantryCacheCleanup(session, () => disk.clear()) : () => undefined;
    const stopScheduleCleanup = bindExpiryScheduleSession(session);
    const stopReceiptCleanup = bindReceiptImportCleanup(session);
    const stopBarcodeCleanup = bindBarcodeRetryCleanup(session);
    void session.refresh().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !session.getSnapshot().checking) void session.refresh().catch(() => undefined);
    });
    return () => { subscription.remove(); stopCacheCleanup(); stopScheduleCleanup(); stopReceiptCleanup(); stopBarcodeCleanup(); };
  }, [session]);
  return <Context.Provider value={{ session, state, allowDemo }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is required.');
  return value;
}
