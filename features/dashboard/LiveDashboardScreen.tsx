import React, { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useRealPantry } from '@/context/RealPantryContext';
import { useRealChef } from '@/context/RealChefContext';
import { createDashboardSession, type DashboardFilter } from '@/lib/dashboard';
import DashboardView from './DashboardView';

export default function LiveDashboardScreen() {
  const { state: auth, session } = useAuth(), pantry = useRealPantry(), chef = useRealChef();
  const pantryRef = useRef(pantry); pantryRef.current = pantry;
  const focused = useRef(false), subject = auth.user?.id;
  const store = useMemo(() => createDashboardSession(async () => {
    if (pantryRef.current.readOnly) await pantryRef.current.reload();
    return pantryRef.current.reminderItems();
  }, () => {
    const current = session.getSnapshot();
    return focused.current && !current.checking && current.status === 'authenticated' && current.user?.id === subject && !current.demo;
  }), [session, subject]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [mode, setMode] = useState<'home' | 'shopping'>('home');
  const [filter, setFilter] = useState<DashboardFilter>('priority');
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!auth.checking) void store.load();
    return () => { focused.current = false; store.invalidate(); };
  }, [store, auth.checking]));
  return <DashboardView name={auth.user?.name ?? 'Your kitchen'} state={state} mode={mode} filter={filter}
    shopping={chef.state.shopping} onMode={setMode} onFilter={setFilter} onRefresh={() => void store.load()}
    onShoppingToggle={name => chef.store.toggleShopping(name)}
    onOpenItem={id => router.push({ pathname: '/pantry/[id]', params: { id } })}
    onAction={action => {
      const routes = { pantry: '/(tabs)/pantry', scan: '/scanner/receipt', add: '/pantry/add', recipes: '/(tabs)/recipes',
        shopping: '/recipe/shopping-list', insights: '/(tabs)/insights', review: '/pantry/reconcile', settings: '/settings' } as const;
      router.push(routes[action]);
    }} />;
}
