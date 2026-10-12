import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { nativeAuthProbe } from '@/features/auth/nativeProbe';
import { createPantryApi, requirePantryStatus, pantryFilterKey } from '@/lib/pantryApi';
import { createPantryReadCache, cacheablePantryFailure } from '@/lib/pantryReadCache';
import { NeonAuthError } from '@/lib/neonAuth';
import type { PantryCreateInput, PantryEditInput, PantryOutcomeInput, PantryBatchInput, PantryBatchOutcomeInput, PantryItemDto, PantryListFilters, PantryInventoryCounts } from '@/types/api';

type Value = { enabled: boolean; items: PantryItemDto[]; loading: boolean; error: string; total: number; hasMore: boolean;
  readOnly: boolean; cachedAt: number | null; cachePreview: boolean; previewCache: () => void; endCachePreview: () => void;
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
  const scope = JSON.stringify([process.env.EXPO_PUBLIC_NEON_AUTH_URL, state.user?.id]);
  const cache = useMemo(() => createPantryReadCache(scope), [scope]);
  const [readOnly, setReadOnly] = useState(false); const readOnlyRef = useRef(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [cachePreview, setCachePreview] = useState(false); const previewRef = useRef(false);
  const [items, setItems] = useState<PantryItemDto[]>([]);
  const [lastOutcome, setLastOutcome] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [total, setTotal] = useState(0); const [hasMore, setHasMore] = useState(false);
  const [filters, updateFilters] = useState<PantryListFilters>({ sort: 'expiry' });
  const filtersRef = useRef(filters);
  const [inventory, setInventory] = useState<PantryInventoryCounts>({ active: 0, categories: {} });
  const loadingRef = useRef(false); const hasMoreRef = useRef(false);
  const page = useRef(0); const generation = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; cache.clear(); }; }, [cache]);
  const showCached = useCallback((criteria: PantryListFilters) => {
    const verified = session.getSnapshot();
    if (verified.checking || verified.user?.id !== state.user?.id || !verified.user) return false;
    const snapshot = cache.read(scope, criteria);
    readOnlyRef.current = true; setReadOnly(true); setHasMore(false); hasMoreRef.current = false;
    setCachedAt(snapshot?.savedAt ?? null); setItems(snapshot?.items ?? []); setTotal(snapshot?.total ?? 0);
    setInventory(snapshot?.inventory ?? { active: 0, categories: {} });
    return !!snapshot;
  }, [cache, scope, session, state.user?.id]);
  const requireLive = () => {
    if (readOnlyRef.current || previewRef.current) throw new NeonAuthError('PANTRY_CACHED', 'Cached Pantry is read-only. Refresh online before making changes.');
  };
  const load = useCallback(async (more: boolean) => {
    if (!enabled || !mounted.current || (more && (loadingRef.current || !hasMoreRef.current))) return;
    const version = ++generation.current;
    const criteria = filtersRef.current;
    const nextPage = more ? page.current + 1 : 1;
    loadingRef.current = true; setLoading(true); setError('');
    try {
      if (__DEV__ && previewRef.current) throw new NeonAuthError('PANTRY_NETWORK', 'Development cached-view test.');
      await api.setup();
      if (!mounted.current || version !== generation.current) return;
      const response = await api.list(nextPage, criteria);
      if (!mounted.current || version !== generation.current) return;
      if (!response.data.inventory) throw new NeonAuthError('PANTRY_VERSION', 'The pantry service needs updating. Retry after the development API deployment.');
      const unfiltered = !criteria.q && !criteria.category && !criteria.freshness;
      cache.remember(scope, response.data.items, !more && unfiltered && !response.data.pagination.hasNextPage);
      readOnlyRef.current = false; setReadOnly(false); setCachedAt(null);
      page.current = nextPage; hasMoreRef.current = response.data.pagination.hasNextPage;
      setInventory(response.data.inventory); setTotal(response.data.pagination.total); setHasMore(response.data.pagination.hasNextPage);
      setItems(current => more ? [...current, ...response.data.items.filter(item => !current.some(existing => existing.id === item.id))] : response.data.items);
    } catch (error) {
      if (mounted.current && version === generation.current) {
        if (error instanceof NeonAuthError && cacheablePantryFailure(error.code)) {
          if (!showCached(criteria)) { readOnlyRef.current = true; setReadOnly(true); setItems([]); setCachedAt(null);
            setTotal(0); setInventory({ active: 0, categories: {} }); hasMoreRef.current = false; setHasMore(false); }
        }
        else { cache.clear(); setItems([]); setCachedAt(null); setTotal(0); setInventory({ active: 0, categories: {} });
          hasMoreRef.current = false; setHasMore(false); readOnlyRef.current = true; setReadOnly(true); }
        setError(error instanceof NeonAuthError ? error.message : 'Unable to load your pantry. Please retry.');
      }
    } finally { if (mounted.current && version === generation.current) { loadingRef.current = false; setLoading(false); } }
  }, [api, enabled, cache, scope, showCached]);
  const setFilters = useCallback((next: PantryListFilters) => {
    if (pantryFilterKey(next) === pantryFilterKey(filtersRef.current)) return;
    filtersRef.current = next; updateFilters(next);
    generation.current++; page.current = 0; hasMoreRef.current = false;
    setItems([]); setTotal(0); setHasMore(false); setError('');
    if (readOnlyRef.current) { loadingRef.current = false; setLoading(false); showCached(next); return; }
    void load(false);
  }, [load, showCached]);
  const reload = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  const find = useCallback(async (id: string) => {
    const verified = session.getSnapshot();
    if (verified.checking || !verified.user || verified.user.id !== state.user?.id) throw new NeonAuthError('UNAUTHORIZED', 'Verify your session before reading Pantry.');
    const cached = () => cache.find(scope, id);
    if (readOnlyRef.current) {
      const item = cached(); if (item) return item;
      throw new NeonAuthError('PANTRY_CACHED_MISSING', 'This item is not cached. Refresh Pantry online to load it.');
    }
    try {
      const item = (await api.find(id)).data.item;
      if (mounted.current) cache.remember(scope, [item]);
      return item;
    }
    catch (error) {
      if (error instanceof NeonAuthError && cacheablePantryFailure(error.code) && showCached(filtersRef.current)) {
        const item = cached(); if (item) return item;
      }
      throw error;
    }
  }, [api, cache, scope, showCached, session, state.user?.id]);
  const duplicates = async (input: PantryCreateInput) => {
    requireLive();
    await api.setup();
    requireLive();
    return (await api.duplicates(input)).data;
  };
  const add = async (input: PantryCreateInput, key: string) => {
    requireLive();
    await api.setup();
    requireLive();
    if (!mounted.current) throw new NeonAuthError('PANTRY_CANCELLED', 'The pantry session changed.');
    const item = (await api.add(input, key)).data.item;
    if (mounted.current) { generation.current++; cache.remember(scope, [item]); }
    if (mounted.current) await reload(); // Saved detail is returned; list refresh failures display a retry notice.
    return item;
  };
  const reconcileMany = async (changed: PantryItemDto[], rememberOutcome = false) => {
    if (mounted.current) {
      cache.remove(scope, changed.map(item => item.id)); cache.remember(scope, changed.filter(item => item.status === 'ACTIVE'));
      generation.current++; // In-flight list reads cannot restore a pre-mutation row.
      setItems(current => current.filter(entry => !changed.some(item => item.id === entry.id))); // Re-query before inserting: edits/restores may no longer match these filters.
      if (rememberOutcome) setLastOutcome(changed.filter(item => ['CONSUMED', 'WASTED'].includes(item.status)));
      else setLastOutcome(current => current.filter(entry => !changed.some(item => item.id === entry.id)));
      await reload();
    }
    return changed;
  };
  const edit = async (id: string, input: PantryEditInput, key: string) => { requireLive(); return (await reconcileMany([(await api.edit(id, input, key)).data.item]))[0]!; };
  const outcome = async (id: string, action: 'consume' | 'waste', input: PantryOutcomeInput, key: string) => {
    requireLive();
    const item = (await api.outcome(id, action, input, key)).data.item;
    requirePantryStatus([item], action === 'consume' ? 'CONSUMED' : 'WASTED'); return (await reconcileMany([item], true))[0]!;
  };
  const undo = async (id: string, input: PantryOutcomeInput, key: string) => {
    requireLive();
    const item = (await api.undo(id, input, key)).data.item; requirePantryStatus([item], 'ACTIVE'); return (await reconcileMany([item]))[0]!;
  };
  const batchOutcome = async (input: PantryBatchOutcomeInput, key: string) => {
    requireLive();
    const changed = (await api.batchOutcome(input, key)).data.items;
    requirePantryStatus(changed, input.action === 'consume' ? 'CONSUMED' : 'WASTED'); return reconcileMany(changed, true);
  };
  const batchUndo = async (input: PantryBatchInput, key: string) => {
    requireLive();
    const changed = (await api.batchUndo(input, key)).data.items; requirePantryStatus(changed, 'ACTIVE'); return reconcileMany(changed);
  };
  return <Context.Provider value={{ enabled, items, loading, error, total, hasMore, readOnly, cachedAt, cachePreview,
    previewCache: () => { if (__DEV__ && enabled) { previewRef.current = true; setCachePreview(true); void reload(); } },
    endCachePreview: () => { previewRef.current = false; setCachePreview(false); void reload(); }, filters, inventory, setFilters, reload, loadMore, duplicates, add, edit, outcome, undo,
    batchOutcome, batchUndo, lastOutcome, dismissUndo: () => setLastOutcome([]),
    find }}>{children}</Context.Provider>;
}
export function useRealPantry() {
  const value = useContext(Context); if (!value) throw new Error('RealPantryProvider required'); return value;
}
