import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRealPantry } from '@/context/RealPantryContext';
import PrimaryButton from './PrimaryButton';
import type { createOverdueReview } from '@/lib/overdueReview';
import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';

/** Development inspection only; the reconciliation banner/bulk UI is Phase 5 item 8. */
export default function OverdueReviewCheck() {
  const { overdueReview } = useRealPantry();
  return __DEV__ && overdueReview ? <Check review={overdueReview} /> : null;
}
function Check({ review }: { review: ReturnType<typeof createOverdueReview> }) {
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
  return <View style={styles.card}>
    <Text style={styles.title}>Overdue check · awaiting confirmation</Text>
    <Text style={styles.body}>Expired groceries stay active. FreshTrack records Used or Wasted only after you confirm.</Text>
    <Text style={styles.body} accessibilityLiveRegion="polite">{state.status === 'ready'
      ? `${state.items.length} expired active ${state.items.length === 1 ? 'item' : 'items'} in your live household Pantry${state.householdDay ? ` · ${state.householdDay}` : ''}.`
      : state.message || 'A fresh overdue check is needed.'}</Text>
    {state.status === 'ready' && state.items.slice(0, 5).map(item => <Text key={item.id} style={styles.body}>{item.name} · expired {item.expiresOn} · ACTIVE</Text>)}
    {state.items.length > 5 && <Text style={styles.body}>Showing the first five overdue names.</Text>}
    <PrimaryButton label="Refresh Overdue Check" variant="ghost" loading={state.status === 'loading'} onPress={() => { void review.request(); }} />
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, marginVertical: Spacing.sm },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.bodyLg, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
});
