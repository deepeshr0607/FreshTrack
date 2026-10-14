import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import PantryConfirmation from '@/components/PantryConfirmation';
import { useRealPantry } from '@/context/RealPantryContext';
import useAuthRequest from '@/features/auth/useAuthRequest';
import type { createOverdueReview } from '@/lib/overdueReview';
import type { PantryItemDto } from '@/types/api';
import { pantryCardItem, pantryRetryKey, rupeeValue } from '@/lib/pantryApi';
import { reconciliationSearch, reconciliationSelection } from '@/lib/reconciliation';
import { NeonAuthError } from '@/lib/neonAuth';
import { Colors } from '@/constants/Theme';

export default function ReconciliationScreen() {
  const real = useRealPantry();
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/pantry')}>
    <Text style={ui.title}>Inventory Reconciliation</Text>
    <Text style={ui.text}>Review expired groceries. Each stays active until you confirm Used or Wasted.</Text>
    {real.enabled && real.overdueReview ? <Review review={real.overdueReview} /> : <View style={ui.card}>
      <Text style={ui.text}>Sign into your household to review real groceries. Demo reconciliation is available in the sample financial screen.</Text>
      <PrimaryButton label="View Sample Analytics" variant="ghost" onPress={() => router.push('/analytics/financial')} />
    </View>}
  </PrototypeScreen>;
}
function Review({ review }: { review: ReturnType<typeof createOverdueReview> }) {
  const real = useRealPantry();
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot, review.getSnapshot);
  const [query, setQuery] = useState(''), [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string[]>([]), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{ rows: PantryItemDto[]; action: 'consume' | 'waste'; key: string } | null>(null);
  const request = useAuthRequest(setError);
  const pendingKey = real.pendingNotificationIds.join('|');
  useEffect(() => { void review.request(); }, [review]);
  useEffect(() => { setSelected([]); }, [state, query, pendingKey]);
  const matches = reconciliationSearch(state.items, query), visible = matches.slice(0, limit);
  const unavailable = real.readOnly || state.status !== 'ready' || request.loading;
  const choose = (ids: string[], action: 'consume' | 'waste') => {
    setError(''); setNotice('');
    try {
      if (unavailable) throw new NeonAuthError('REVIEW_UNAVAILABLE', 'Refresh Pantry online before confirming expired groceries.');
      const rows = reconciliationSelection(review.getSnapshot(), ids, real.pendingNotificationIds);
      setConfirmation({ rows, action, key: pantryRetryKey() });
    } catch (error) { setError(error instanceof NeonAuthError ? error.message : 'Unable to prepare this review. Refresh and retry.'); }
  };
  return <>
    {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
    {!!error && !confirmation && <Text style={[ui.text, { color: Colors.error }]} accessibilityRole="alert">{error}</Text>}
    {real.readOnly && <Text style={ui.text}>Cached Pantry is read-only. Refresh online before confirming outcomes.</Text>}
    <PrimaryButton label={real.readOnly ? 'Refresh Pantry Online' : 'Refresh Expired Items'} variant="ghost" loading={state.status === 'loading' || real.loading}
      disabled={request.loading} onPress={() => { setError(''); if (real.readOnly) void real.reload(); else void review.request(); }} />
    {state.status !== 'ready' ? <Text style={ui.text} accessibilityLiveRegion="polite">{state.message || 'A live expired-item review is needed.'}</Text> : <>
      <Text style={ui.text}>{state.items.length} expired groceries awaiting confirmation{state.householdDay ? ` · ${state.householdDay}` : ''}.</Text>
      <TextInput accessibilityLabel="Search expired groceries" placeholder="Search expired groceries" value={query} maxLength={120}
        editable={!request.loading} onChangeText={value => { setQuery(value); setLimit(20); setSelected([]); }} style={[ui.card, ui.text, { padding: 14 }]} />
      <Text style={ui.text}>{selected.length} selected · Maximum 20 per confirmation</Text>
      <PrimaryButton label="Select Visible (up to 20)" variant="ghost" disabled={unavailable || !visible.length}
        onPress={() => setSelected(visible.filter(row => !real.pendingNotificationIds.includes(row.id)).slice(0, 20).map(row => row.id))} />
      {!!selected.length && <>
        <PrimaryButton label="Clear Selection" variant="ghost" disabled={request.loading} onPress={() => setSelected([])} />
        <PrimaryButton label="Mark Selected Used" disabled={unavailable} onPress={() => choose(selected, 'consume')} />
        <PrimaryButton label="Mark Selected Wasted" variant="ghost" disabled={unavailable} onPress={() => choose(selected, 'waste')} />
      </>}
      {!matches.length && <View style={ui.card}><Text style={ui.heading}>{state.items.length ? 'No expired groceries match' : 'All caught up'}</Text>
        <Text style={ui.text}>{state.items.length ? 'Clear the search to review other expired groceries.' : 'No expired groceries are awaiting confirmation.'}</Text>
        {!!query && <PrimaryButton label="Clear Search" variant="ghost" onPress={() => setQuery('')} />}
      </View>}
      {visible.map(item => {
        const pending = real.pendingNotificationIds.includes(item.id), checked = selected.includes(item.id);
        return <View key={item.id} style={ui.card}>
          <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${item.name}`} accessibilityState={{ checked, disabled: unavailable || pending }}
            disabled={unavailable || pending} onPress={() => {
              if (!checked && selected.length >= 20) { setError('Confirm up to twenty groceries at a time.'); return; }
              setSelected(current => checked ? current.filter(id => id !== item.id) : [...current, item.id]);
            }}><Text style={ui.heading}>{checked ? '☑' : '☐'} {item.name}</Text></Pressable>
          <Text style={ui.text}>{item.quantity} {item.unit} · Expired {item.expiresOn} · {rupeeValue(item.totalCostMinor)}</Text>
          {pending && <Text style={ui.text}>A notification outcome is pending. Sync or review it before confirming another outcome.</Text>}
          <View style={ui.row}>
            <PrimaryButton label="Used" variant="ghost" disabled={unavailable || pending} style={{ flex: 1 }} onPress={() => choose([item.id], 'consume')} />
            <PrimaryButton label="Wasted" variant="ghost" disabled={unavailable || pending} style={{ flex: 1 }} onPress={() => choose([item.id], 'waste')} />
          </View>
          <PrimaryButton label="View Item Details" variant="ghost" disabled={request.loading} onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.id } })} />
        </View>;
      })}
      {matches.length > visible.length && <PrimaryButton label="Show More Expired Items" variant="ghost" disabled={request.loading} onPress={() => setLimit(value => value + 20)} />}
    </>}
    <PantryConfirmation item={null} items={confirmation?.rows.map(pantryCardItem) ?? []} action={confirmation?.action === 'waste' ? 'WASTED' : 'CONSUMED'}
      currencySymbol="₹" unknownIds={confirmation?.rows.filter(row => row.totalCostMinor === null).map(row => row.id)} loading={request.loading} error={error}
      onCancel={() => { setConfirmation(null); setError(''); }} onConfirm={() => {
        if (!confirmation) return;
        const captured = confirmation;
        void request.run(async isMounted => {
          await real.batchOutcome({ confirmed: true, action: captured.action,
            items: captured.rows.map(row => ({ id: row.id, expectedUpdatedAt: row.updatedAt })) }, captured.key);
          if (isMounted()) { setConfirmation(null); setSelected([]); setError(''); setNotice(`${captured.rows.length} ${captured.rows.length === 1 ? 'outcome' : 'outcomes'} saved to your household.`); }
        });
      }} />
  </>;
}
