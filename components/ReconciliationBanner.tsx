import React, { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useRealPantry } from '@/context/RealPantryContext';
import type { createOverdueReview } from '@/lib/overdueReview';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';
import { Colors } from '@/constants/Theme';

export default function ReconciliationBanner() {
  const real = useRealPantry();
  return real.enabled && real.overdueReview ? <Banner review={real.overdueReview} /> : null;
}
function Banner({ review }: { review: ReturnType<typeof createOverdueReview> }) {
  const real = useRealPantry();
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
  if (state.status === 'ready' && !state.items.length) return null;
  return <View style={[ui.card, { backgroundColor: Colors.surfaceContainerLow }]}>
    <Text style={ui.heading}>Inventory Reconciliation</Text>
    <Text style={ui.text} accessibilityLiveRegion="polite">{state.status === 'ready'
      ? `${state.items.length} ${state.items.length === 1 ? 'item has' : 'items have'} expired. Were they used or wasted?`
      : state.status === 'loading' ? 'Checking for expired groceries…' : 'The expired-item review needs a live Pantry refresh.'}</Text>
    {state.status === 'ready' && <Text style={ui.text}>These groceries stay active until you confirm their outcome.</Text>}
    {real.readOnly ? <PrimaryButton label="Refresh Pantry Online" variant="ghost" loading={real.loading} onPress={() => { void real.reload(); }} />
      : state.status === 'ready' ? <PrimaryButton label="Review Expired Items" onPress={() => router.push('/pantry/reconcile')} />
      : state.status !== 'loading' && <PrimaryButton label="Retry Expiry Check" variant="ghost" onPress={() => { void review.request(); }} />}
  </View>;
}
