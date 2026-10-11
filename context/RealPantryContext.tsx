import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { createPantryApi } from '@/lib/pantryApi';
import { NeonAuthError } from '@/lib/neonAuth';
import type { PantryCreateInput, PantryItemDto } from '@/types/api';

type Value = { enabled: boolean; items: PantryItemDto[]; loading: boolean; error: string; total: number; hasMore: boolean;
  reload: () => Promise<void>; loadMore: () => Promise<void>;
  add: (input: PantryCreateInput, key: string) => Promise<PantryItemDto>;
  find: (id: string) => Promise<PantryItemDto> };
const Context = createContext<Value | null>(null);
export function RealPantryProvider({ children }: { children: React.ReactNode }) {
  const { state, session } = useAuth();
  const enabled = !!state.user && !!nativeAuthProbe;
  const api = useMemo(() => createPantryApi(process.env.EXPO_PUBLIC_API_URL, async () => {
    const subject = state.user?.id;
    const belongsToSession = () => !!subject && session.getSnapshot().user?.id === subject && !session.getSnapshot().checking;
    if (!nativeAuthProbe || !belongsToSession()) throw new NeonAuthError('UNAUTHORIZED', 'Sign in to use your pantry.');
    const token = await nativeAuthProbe.getApiToken();
    if (!belongsToSession()) throw new NeonAuthError('UNAUTHORIZED', 'Your session changed. Reopen your pantry.');
    return token;
  }, __DEV__), [session, state.user?.id]);
  const [items, setItems] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [total, setTotal] = useState(0); const [hasMore, setHasMore] = useState(false);
  const page = useRef(0); const generation = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const load = useCallback(async (more: boolean) => {
    if (!enabled || !mounted.current) return;
    const version = ++generation.current;
    const nextPage = more ? page.current + 1 : 1;
    setLoading(true); setError('');
    try {
      await api.setup();
      if (!mounted.current || version !== generation.current) return;
      const response = await api.list(nextPage);
      if (!mounted.current || version !== generation.current) return;
      page.current = nextPage; setTotal(response.data.pagination.total); setHasMore(response.data.pagination.hasNextPage);
      setItems(current => more ? [...current, ...response.data.items.filter(item => !current.some(existing => existing.id === item.id))] : response.data.items);
    } catch (error) {
      if (mounted.current && version === generation.current) setError(error instanceof NeonAuthError ? error.message : 'Unable to load your pantry. Please retry.');
    } finally { if (mounted.current && version === generation.current) setLoading(false); }
  }, [api, enabled]);
  const reload = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  const find = useCallback(async (id: string) => (await api.find(id)).data.item, [api]);
  const add = async (input: PantryCreateInput, key: string) => {
    await api.setup();
    if (!mounted.current) throw new NeonAuthError('PANTRY_CANCELLED', 'The pantry session changed.');
    const item = (await api.add(input, key)).data.item;
    if (mounted.current) { setItems(current => [item, ...current.filter(entry => entry.id !== item.id)]); }
    if (mounted.current) await reload(); // Reload failures retain the saved row and display a retry notice.
    return item;
  };
  return <Context.Provider value={{ enabled, items, loading, error, total, hasMore, reload, loadMore, add,
    find }}>{children}</Context.Provider>;
}
export function useRealPantry() {
  const value = useContext(Context); if (!value) throw new Error('RealPantryProvider required'); return value;
}
