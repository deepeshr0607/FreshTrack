import PantryExpiryFields from '@/components/PantryExpiryFields';
import { expiryDraft, expirySelection, resolveExpiry } from '@/lib/pantryExpiry';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import ExpiryBadge from '@/components/ExpiryBadge';
import PantryConfirmation from '@/components/PantryConfirmation';
import { useMockPantry } from '@/context/MockPantryContext';
import { Colors, Elevation, FontSize, Radius, Spacing } from '@/constants/Theme';
import { PANTRY_CATEGORIES, validatePantryEdit, type PantryEdit, type PantryDraft } from '@/lib/pantry';
import type { PantryItem } from '@/lib/mock';
import { useRealPantry } from '@/context/RealPantryContext';
import type { PantryItemDto } from '@/types/api';
import { manualPantryInput, pantryCardItem, pantryRetryKey, rupeeValue } from '@/lib/pantryApi';
import { NeonAuthError } from '@/lib/neonAuth';
import useAuthRequest from '@/features/auth/useAuthRequest';

function backToPantry(added?: string) {
  router.dismissTo(added ? { pathname: '/(tabs)/pantry', params: { added } } : '/(tabs)/pantry');
}

export default function PantryDetailScreen() {
  const { id, added } = useLocalSearchParams<{ id: string; added?: string }>();
  const { items } = useMockPantry();
  const real = useRealPantry();
  const item = items.find((entry) => entry.id === id);
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => backToPantry(added)} style={styles.back}>
            <Text style={styles.link}>← Back to Pantry</Text>
          </Pressable>
          {real.enabled ? <PersistedItem key={id} id={id} /> : item ? <ItemEditor key={item.id} item={item} /> : (
            <View style={styles.card}>
              <Text style={styles.title}>Item unavailable</Text>
              <Text style={styles.body}>This item is not in your demo inventory.</Text>
              <PrimaryButton label="View Pantry" onPress={() => router.replace('/(tabs)/pantry')} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PersistedItem({ id }: { id: string }) {
  const { find, readOnly } = useRealPantry();
  const [item, setItem] = useState<PantryItemDto | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let mounted = true; setError('');
    void find(id).then(value => { if (mounted) setItem(value); }).catch(error => {
      if (mounted) setError(error instanceof NeonAuthError ? error.message : 'Unable to load this item. Please retry.');
    });
    return () => { mounted = false; };
  }, [id, find, attempt]);
  if (!item) return <View style={styles.card}><Text style={styles.body}>{error || 'Loading item…'}</Text>
    {!!error && <PrimaryButton label={readOnly ? "Back to Pantry" : "Retry Item"} onPress={() => readOnly ? backToPantry() : setAttempt(value => value + 1)} />}</View>;
  return <>
    {!!notice && <Text style={styles.link} accessibilityLiveRegion="polite">{notice}</Text>}
    <PersistedEditor key={`${item.id}:${item.updatedAt}`} item={item} onSaved={saved => {
      setItem(saved); setNotice(saved.status === 'ACTIVE' ? item.status === 'ACTIVE' ? 'Changes saved to your household.' : 'Item restored to active Pantry.' : 'Confirmed outcome saved to your household.');
    }} onReload={() => { setItem(null); setNotice(''); setAttempt(value => value + 1); }} />
  </>;
}

function PersistedEditor({ item, onSaved, onReload }: { item: PantryItemDto; onSaved: (item: PantryItemDto) => void; onReload: () => void }) {
  const real = useRealPantry();
  const initial: PantryDraft = { name: item.name, category: pantryCardItem(item).category, quantity: item.quantity,
    unit: item.unit, expiresOn: item.expiresOn, price: item.totalCostMinor === null ? '' : (item.totalCostMinor / 100).toFixed(2) };
  const initialExpiry = expiryDraft(item);
  const [expiry, setExpiry] = useState(initialExpiry);
  const [draft, setDraft] = useState(initial); const [error, setError] = useState('');
  const [message, setMessage] = useState(''); const [confirmation, setConfirmation] = useState<'CONSUMED' | 'WASTED' | 'RESTORE' | null>(null);
  const [outcomeError, setOutcomeError] = useState('');
  const saveRequest = useAuthRequest(setError); const outcomeRequest = useAuthRequest(setOutcomeError);
  const editKey = useRef(pantryRetryKey()); const outcomeKey = useRef(pantryRetryKey());
  const busy = saveRequest.loading || outcomeRequest.loading;
  const active = item.status === 'ACTIVE' && !real.readOnly;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || JSON.stringify(expiry) !== JSON.stringify(initialExpiry);
  const change = <K extends keyof PantryDraft>(key: K, value: PantryDraft[K]) => {
    if (busy) return;
    setDraft(current => ({ ...current, [key]: value })); setError(''); setMessage(''); editKey.current = pantryRetryKey();
  };
  return <>
    <View style={styles.card}>
      <Text style={styles.emoji}>{pantryCardItem(item).imageEmoji}</Text>
      <Text style={styles.title}>{item.name}</Text><Text style={styles.body}>{rupeeValue(item.totalCostMinor)} · INR · Asia/Kolkata</Text>
      {real.readOnly && <Text style={styles.body}>Cached item · read-only. Refresh Pantry online before editing or confirming an outcome.</Text>}
      <ExpiryBadge daysLeft={item.daysLeft} expirySource={item.expirySource} />
      {item.status !== 'ACTIVE' && <Text style={styles.body}>Marked as {item.status === 'WASTED' ? 'wasted' : 'used'}. This outcome is saved to your household.</Text>}
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>Item Details</Text>
      <FormInput label="Item name" value={draft.name} editable={active && !busy} maxLength={120} onChangeText={value => change('name', value)} />
      <Text style={styles.body}>Category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PANTRY_CATEGORIES.map(category => <Pressable key={category.name} accessibilityRole="radio" accessibilityState={{ checked: draft.category === category.name }}
          disabled={!active || busy} onPress={() => change('category', category.name)} style={{ padding: Spacing.sm, minHeight: 44, justifyContent: 'center', borderRadius: Radius.full,
            backgroundColor: draft.category === category.name ? Colors.primary : Colors.surfaceContainerLow }}>
          <Text style={[styles.body, draft.category === category.name && { color: Colors.white }]}>{category.emoji} {category.name}</Text>
        </Pressable>)}
      </View>
      <FormInput label="Quantity" value={draft.quantity} keyboardType="decimal-pad" editable={active && !busy} onChangeText={value => change('quantity', value)} />
      <FormInput label="Unit" value={draft.unit} maxLength={32} editable={active && !busy} onChangeText={value => change('unit', value)} />
      <PantryExpiryFields name={draft.name} category={draft.category.toUpperCase() as PantryItemDto['category']} value={expiry} disabled={!active || busy}
        onChange={value => { if (busy || !active) return; setExpiry(value); setError(''); setMessage(''); editKey.current = pantryRetryKey(); }} />
      <FormInput label="Purchase value (₹, optional)" value={draft.price} keyboardType="decimal-pad" editable={active && !busy} onChangeText={value => change('price', value)} />
      <Text style={styles.body}>Value of this whole entry. Blank is unknown; zero means free.</Text>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {!!message && <Text style={styles.link} accessibilityLiveRegion="polite">{message}</Text>}
      {active && <>
        <PrimaryButton label="Save Changes" loading={saveRequest.loading} disabled={!dirty || busy} onPress={() => {
          setError(''); void saveRequest.run(async isMounted => {
            let resolved;
            try { resolved = resolveExpiry(expirySelection(expiry)); } catch (error) { throw new NeonAuthError('INVALID_REQUEST', (error as Error).message); }
            const fields = { ...draft, expiresOn: resolved.expiresOn };
            const validation = validatePantryEdit(fields); if (validation) throw new NeonAuthError('INVALID_REQUEST', validation);
            const saved = await real.edit(item.id, { ...manualPantryInput(fields), expirySelection: resolved.selection, expectedUpdatedAt: item.updatedAt }, editKey.current);
            if (isMounted()) { setMessage('Changes saved to your household.'); onSaved(saved); }
          });
        }} />
        {dirty && <Text style={styles.body}>Save your changes before confirming Used or Wasted.</Text>}
        <PrimaryButton label="Mark as Used" variant="ghost" disabled={dirty || busy} onPress={() => { outcomeKey.current = pantryRetryKey(); setOutcomeError(''); setConfirmation('CONSUMED'); }} />
        <PrimaryButton label="Mark as Wasted" variant="ghost" disabled={dirty || busy} onPress={() => { outcomeKey.current = pantryRetryKey(); setOutcomeError(''); setConfirmation('WASTED'); }} />
      </>}
      {['CONSUMED', 'WASTED'].includes(item.status) && <PrimaryButton label="Undo Outcome" variant="ghost" disabled={busy || real.readOnly}
        onPress={() => { outcomeKey.current = pantryRetryKey(); setOutcomeError(''); setConfirmation('RESTORE'); }} />}
      <PrimaryButton label="Reload Item" variant="ghost" disabled={busy || real.readOnly} onPress={onReload} />
      <Text style={styles.body}>Reload discards unsaved changes and fetches the latest item.</Text>
    </View>
    <PantryConfirmation item={confirmation ? pantryCardItem(item) : null} action={confirmation === 'WASTED' ? 'WASTED' : 'CONSUMED'} undo={confirmation === 'RESTORE'} loading={outcomeRequest.loading} error={outcomeError}
      onCancel={() => { setConfirmation(null); setOutcomeError(''); }} onConfirm={() => {
        if (!confirmation) return; setOutcomeError('');
        void outcomeRequest.run(async isMounted => {
          const input = { confirmed: true as const, expectedUpdatedAt: item.updatedAt };
          const saved = confirmation === 'RESTORE' ? await real.undo(item.id, input, outcomeKey.current)
            : await real.outcome(item.id, confirmation === 'CONSUMED' ? 'consume' : 'waste', input, outcomeKey.current);
          if (isMounted()) { setConfirmation(null); onSaved(saved); }
        });
      }} />
  </>;
}

function ItemEditor({ item }: { item: PantryItem }) {
  const { dispatch } = useMockPantry();
  const [edit, setEdit] = useState<PantryEdit>({ name: item.name, quantity: String(item.quantity),
    unit: item.unit, expiresOn: item.expiresOn });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<'CONSUMED' | 'WASTED' | null>(null);
  const active = item.status === 'ACTIVE';
  const change = (field: keyof PantryEdit, value: string) => {
    setEdit((previous) => ({ ...previous, [field]: value }));
    setError(null);
    setMessage('');
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.emoji}>{item.imageEmoji}</Text>
        <Text accessibilityRole="header" style={styles.title}>{item.name}</Text>
        <Text style={styles.body}>{item.category} · ${item.price.toFixed(2)} value</Text>
        {!!item.note && <Text style={styles.body}>{item.note}</Text>}
        <ExpiryBadge daysLeft={item.daysLeft} expirySource={item.expirySource} />
        {!active && <Text style={styles.body}>Marked as {item.status === 'WASTED' ? 'wasted' : 'used'}.</Text>}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Item Details</Text>
        <FormInput label="Item name" accessibilityLabel="Item name" value={edit.name}
          onChangeText={(value) => change('name', value)} editable={active} />
        <FormInput label="Quantity" accessibilityLabel="Quantity" value={edit.quantity}
          onChangeText={(value) => change('quantity', value)} keyboardType="decimal-pad" editable={active} />
        <FormInput label="Unit" accessibilityLabel="Unit" value={edit.unit}
          onChangeText={(value) => change('unit', value)} editable={active} />
        <FormInput label="Expiry date (YYYY-MM-DD)" accessibilityLabel="Expiry date" value={edit.expiresOn}
          onChangeText={(value) => change('expiresOn', value)} autoCapitalize="none" editable={active} />
        <Text style={styles.body}>Changing the expiry date marks it as user entered.</Text>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!message && <Text accessibilityLiveRegion="polite" style={styles.link}>{message}</Text>}
        {active && <>
          <PrimaryButton label="Save Changes" onPress={() => {
            const validation = validatePantryEdit(edit);
            setError(validation);
            if (validation) return;
            dispatch({ type: 'edit', id: item.id, edit });
            setMessage('Changes saved to your demo inventory.');
          }} />
          <PrimaryButton label="Mark as Used" variant="ghost" onPress={() => setConfirmation('CONSUMED')} />
          <PrimaryButton label="Mark as Wasted" variant="ghost" onPress={() => setConfirmation('WASTED')} />
        </>}
      </View>
      <PantryConfirmation item={confirmation ? item : null} action={confirmation ?? 'CONSUMED'}
        onCancel={() => setConfirmation(null)} onConfirm={() => {
          if (!confirmation) return;
          dispatch({ type: 'status', id: item.id, status: confirmation });
          setConfirmation(null);
          backToPantry();
        }} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.screenGutter, gap: Spacing.base, paddingBottom: Spacing.xl2 },
  back: { paddingVertical: Spacing.md },
  link: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary, fontSize: FontSize.bodyMd },
  card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.base, gap: Spacing.md, borderWidth: 1, borderColor: '#E2E8F0', ...Elevation.card },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.headlineMd, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  emoji: { fontSize: 48 },
  error: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.error, fontSize: FontSize.bodyMd },
});
