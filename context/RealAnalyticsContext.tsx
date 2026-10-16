import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './AuthContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { createAnalyticsApi } from '@/lib/analyticsApi';
import { createAnalyticsSession } from '@/lib/analyticsSession';
import { NeonAuthError } from '@/lib/neonAuth';
const Context = createContext<ReturnType<typeof createAnalyticsSession> | null>(null);
export function RealAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { session, state } = useAuth();
  const store = useMemo(() => {
    const subject = state.user?.id;
    const active = () => { const value = session.getSnapshot(); return !!subject && !!nativeAuthProbe && !value.checking && value.status === 'authenticated' && value.user?.id === subject && !value.demo; };
    const api = createAnalyticsApi(process.env.EXPO_PUBLIC_API_URL, async () => {
      if (!active() || !nativeAuthProbe) throw new NeonAuthError('UNAUTHORIZED', 'Sign in to view analytics.');
      const token = await nativeAuthProbe.getApiToken();
      if (!active()) throw new NeonAuthError('UNAUTHORIZED', 'Your session changed. Reopen analytics.');
      return token;
    }, __DEV__);
    return createAnalyticsSession(api, active);
  }, [session, state.user?.id]);
  useEffect(() => {
    const stop = session.subscribe(() => { const current = session.getSnapshot(); if (current.checking || current.status !== 'authenticated' || current.user?.id !== state.user?.id) store.invalidate(); });
    return () => { stop(); store.invalidate(); };
  }, [session, store, state.user?.id]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useRealAnalytics() {
  const store = useContext(Context); if (!store) throw Error('RealAnalyticsProvider is required.');
  return { store, state: useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot) };
}
