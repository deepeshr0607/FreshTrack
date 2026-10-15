import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from './AuthContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { createChefApi } from '@/lib/chefApi';
import { createChefSession } from '@/lib/chefSession';
import { NeonAuthError } from '@/lib/neonAuth';
const Context = createContext<ReturnType<typeof createChefSession> | null>(null);
export function RealChefProvider({ children }: { children: React.ReactNode }) {
  const { session, state } = useAuth();
  const store = useMemo(() => {
    const subject = state.user?.id;
    const active = () => { const value = session.getSnapshot(); return !!subject && !!nativeAuthProbe && !value.checking && value.status === 'authenticated' && value.user?.id === subject && !value.demo; };
    const api = createChefApi(process.env.EXPO_PUBLIC_API_URL, async () => {
      if (!active() || !nativeAuthProbe) throw new NeonAuthError('UNAUTHORIZED', 'Sign in to use Recipes.');
      const token = await nativeAuthProbe.getApiToken();
      if (!active()) throw new NeonAuthError('UNAUTHORIZED', 'Your session changed. Reopen Recipes.');
      return token;
    }, __DEV__);
    return createChefSession(api, active);
  }, [session, state.user?.id]);
  useEffect(() => {
    const stop = session.subscribe(() => { const current = session.getSnapshot(); if (current.checking || current.status !== 'authenticated' || current.user?.id !== state.user?.id) store.invalidate(); });
    return () => { stop(); store.invalidate(); };
  }, [session, store, state.user?.id]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useRealChef() {
  const store = useContext(Context); if (!store) throw new Error('RealChefProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { store, state };
}
