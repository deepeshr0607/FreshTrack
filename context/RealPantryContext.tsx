import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { createPantryApi, requirePantryStatus, pantryFilterKey } from '@/lib/pantryApi';
import { NeonAuthError } from '@/lib/neonAuth';
import type { PantryCreateInput, PantryEditInput, PantryOutcomeInput, PantryBatchInput, PantryBatchOutcomeInput, PantryItemDto, PantryListFilters, PantryInventoryCounts } from '@/types/api';

type Value = { enabled: boolean; items: PantryItemDto[]; loading: boolean; error: string; total: number; hasMore: boolean;
  filters: PantryListFilters; inventory: PantryInventoryCounts; setFilters: (filters: PantryListFilters) => void;
  reload: () => Promise<void>; loadMore: () => Promise<void>;
  duplicates: (input: PantryCreateInput) => Promise<{ matches: PantryItemDto[]; total: number }>;
  add: (input: PantryCreateInput, key: string) => Promise<PantryItemDto>;
  edit: (id: string, input: PantryEditInput, key: string) => Promise<PantryItemDto>;
  outcome: (id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) => Promise<PantryItemDto>;
  undo: (id: string, input: PantryOutcomeInput, key: string) => Promise<PantryItemDto>;
  batchOutcome: (input: PantryBatchOutcomeInput, key: string) => Promise<PantryItemDto[]>;
  batchUndo: (input: PantryBatchInput, key: string) => Promise<PantryItemDto[]>;
  lastOutcome: PantryItemDto[]; dismissUndo: () => void;
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
  const [lastOutcome, setLastOutcome] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [total, setTotal] = useState(0); const [hasMore, setHasMore] = useState(false);
  const [filters, updateFilters] = useState<PantryListFilters>({ sort: 'expiry' });
  const filtersRef = useRef(filters);
  const [inventory, setInventory] = useState<PantryInventoryCounts>({ active: 0, categories: {} });
  const loadingRef = useRef(false); const hasMoreRef = useRef(false);
  const page = useRef(0); const generation = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  const load = useCallback(async (more: boolean) => {
    if (!enabled || !mounted.current || (more && (loadingRef.current || !hasMoreRef.current))) return;
    const version = ++generation.current;
    const criteria = filtersRef.current;
    const nextPage = more ? page.current + 1 : 1;
    loadingRef.current = true; setLoading(true); setError('');
    try {
      await api.setup();
      if (!mounted.current || version !== generation.current) return;
      const response = await api.list(nextPage, criteria);
      if (!mounted.current || version !== generation.current) return;
      if (!response.data.inventory) throw new NeonAuthError('PANTRY_VERSION', 'The pantry service needs updating. Retry after the development API deployment.');
      page.current = nextPage; hasMoreRef.current = response.data.pagination.hasNextPage;
      setInventory(response.data.inventory); setTotal(response.data.pagination.total); setHasMore(response.data.pagination.hasNextPage);
      setItems(current => more ? [...current, ...response.data.items.filter(item => !current.some(existing => existing.id === item.id))] : response.data.items);
    } catch (error) {
      if (mounted.current && version === generation.current) setError(error instanceof NeonAuthError ? error.message : 'Unable to load your pantry. Please retry.');
    } finally { if (mounted.current && version === generation.current) { loadingRef.current = false; setLoading(false); } }
  }, [api, enabled]);
  const setFilters = useCallback((next: PantryListFilters) => {
    if (pantryFilterKey(next) === pantryFilterKey(filtersRef.current)) return;
    filtersRef.current = next; updateFilters(next);
    generation.current++; page.current = 0; hasMoreRef.current = false;
    setItems([]); setTotal(0); setHasMore(false); setError('');
    void load(false);
  }, [load]);
  const reload = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  const find = useCallback(async (id: string) => (await api.find(id)).data.item, [api]);
  const duplicates = async (input: PantryCreateInput) => {
    await api.setup();
    return (await api.duplicates(input)).data;
  };
  const add = async (input: PantryCreateInput, key: string) => {
    await api.setup();
    if (!mounted.current) throw new NeonAuthError('PANTRY_CANCELLED', 'The pantry session changed.');
    const item = (await api.add(input, key)).data.item;
    if (mounted.current) { generation.current++; }
    if (mounted.current) await reload(); // Saved detail is returned; list refresh failures display a retry notice.
    return item;
  };
  const reconcileMany = async (changed: PantryItemDto[], rememberOutcome = false) => {
    if (mounted.current) {
      generation.current++; // In-flight list reads cannot restore a pre-mutation row.
      setItems(current => current.filter(entry => !changed.some(item => item.id === entry.id))); // Re-query before inserting: edits/restores may no longer match these filters.
      if (rememberOutcome) setLastOutcome(changed.filter(item => ['CONSUMED', 'WASTED'].includes(item.status)));
      else setLastOutcome(current => current.filter(entry => !changed.some(item => item.id === entry.id)));
      await reload();
    }
    return changed;
  };
  const edit = async (id: string, input: PantryEditInput, key: string) => (await reconcileMany([(await api.edit(id, input, key)).data.item]))[0]!;
  const outcome = async (id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) => {
    const item = (await api.outcome(id, action, input, key)).data.item;
    requirePantryStatus([item], action === 'consume' ? 'CONSUMED' : 'WASTED'); return (await reconcileMany([item], true))[0]!;
  };
  const undo = async (id: string, input: PantryOutcomeInput, key: string) => {
    const item = (await api.undo(id, input, key)).data.item; requirePantryStatus([item], 'ACTIVE'); return (await reconcileMany([item]))[0]!;
  };
  const batchOutcome = async (input: PantryBatchOutcomeInput, key: string) => {
    const changed = (await api.batchOutcome(input, key)).data.items;
    requirePantryStatus(changed, input.action === 'consume' ? 'CONSUMED' : 'WASTED'); return reconcileMany(changed, true);
  };
  const batchUndo = async (input: PantryBatchInput, key: string) => {
    const changed = (await api.batchUndo(input, key)).data.items; requirePantryStatus(changed, 'ACTIVE'); return reconcileMany(changed);
  };
  return <Context.Provider value={{ enabled, items, loading, error, total, hasMore, filters, inventory, setFilters, reload, loadMore, duplicates, add, edit, outcome, undo,
    batchOutcome, batchUndo, lastOutcome, dismissUndo: () => setLastOutcome([]),
    find }}>{children}</Context.Provider>;
}
export function useRealPantry() {
  const value = useContext(Context); if (!value) throw new Error('RealPantryProvider required'); return value;
}
