import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React, { useState, useSyncExternalStore } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useRealPantry } from '@/context/RealPantryContext';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import type { createNotificationOutbox } from '@/lib/notificationOutbox';

export default function NotificationQueuePanel({ item }: { item?: { id: string; name: string } }) {
  const { notificationOutbox } = useRealPantry();
  return notificationOutbox ? <QueuePanel queue={notificationOutbox} item={item} /> : null;
}
function QueuePanel({ queue, item }: { queue: ReturnType<typeof createNotificationOutbox>; item?: { id: string; name: string } }) {
  const { items } = useRealPantry();
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const [error, setError] = useState('');
  const run = (task: () => Promise<unknown>) => { setError(''); void task().catch(() => setError('Unable to update saved actions. Retry after verifying your session.')); };
  if (!DIAGNOSTICS_ENABLED && !state.entries.length && !state.message) return null;
  return <View style={styles.card}>
    <Text style={styles.title}>Notification actions · {state.entries.length} pending</Text>
    <Text style={styles.body}>Pending outcomes are saved on this device, not confirmed by the server. Retries resume after the same account is verified. Signing out keeps these retries for that account.</Text>
    {!!state.message && <Text style={styles.body} accessibilityLiveRegion="polite">{state.message}</Text>}
    {!!error && <Text style={styles.body} accessibilityRole="alert">{error}</Text>}
    {state.entries.map(row => <View key={row.key} style={{ gap: Spacing.sm }}>
      <Text style={styles.body}>{item?.id === row.id ? item.name : items.find(entry => entry.id === row.id)?.name || 'Grocery pending review'} · {row.action === 'consume' ? 'Used' : 'Wasted'} · {row.blocked ? 'Needs review' : 'Awaiting sync'}</Text>
      <PrimaryButton label="Review Item" variant="ghost" onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: row.id } })} />
      <PrimaryButton label="Forget This Retry" variant="ghost" disabled={state.busy} onPress={() => Alert.alert('Forget saved retry?',
        'This stops retrying. It does not undo any outcome already saved online. Review the item before confirming a new action.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Forget Retry', style: 'destructive', onPress: () => run(() => queue.discard(row.key)) }])} />
    </View>)}
    <PrimaryButton label="Retry Notification Sync" variant="ghost" loading={state.busy} onPress={() => run(queue.flush)} />
    {DIAGNOSTICS_ENABLED && <PrimaryButton label={state.paused ? 'End Notification Test & Sync' : 'Pause Notification Sync (Test)'} variant="ghost" disabled={state.busy}
      onPress={() => run(() => queue.pause(!state.paused))} />}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, marginVertical: Spacing.sm },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.bodyLg, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
});
