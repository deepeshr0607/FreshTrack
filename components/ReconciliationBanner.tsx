import React, { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRealPantry } from '@/context/RealPantryContext';
import type { createOverdueReview } from '@/lib/overdueReview';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';
import { Colors } from '@/constants/Theme';

export default function ReconciliationBanner({ compact = false }: { compact?: boolean }) {
  const real = useRealPantry();
  return real.enabled && real.overdueReview ? <Banner review={real.overdueReview} compact={compact} /> : null;
}
function Banner({ review, compact }: { review: ReturnType<typeof createOverdueReview>; compact: boolean }) {
  const real = useRealPantry();
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
  if (state.status === 'ready' && !state.items.length) return null;
  if (compact) {
    const ready = state.status === 'ready';
    const label = real.readOnly ? 'Refresh Pantry Online' : ready ? 'Review Expired Items' : 'Retry Expiry Check';
    return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={state.status === 'loading' || real.loading}
      onPress={() => { if (real.readOnly) void real.reload(); else if (ready) router.push('/pantry/reconcile'); else void review.request(); }} style={s.banner}>
      <View style={s.icon}><MaterialCommunityIcons name="clock-alert-outline" size={24} color={Colors.criticalRose} accessible={false} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={s.title}>{ready ? `${state.items.length} overdue · let’s check in` : state.status === 'loading' ? 'Checking expiry dates…' : 'Expiry check needs a refresh'}</Text>
        <Text style={s.body}>{real.readOnly ? 'Refresh online to review outcomes' : ready ? 'Review what was used or wasted' : 'Groceries stay active until you confirm'}</Text></View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.criticalRose} accessible={false} />
    </Pressable>;
  }
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

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 18, borderRadius: 18, backgroundColor: '#FFF0F2' },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, lineHeight: 20, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 11, lineHeight: 17, color: Colors.onSurfaceVariant },
});
