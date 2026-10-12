import PantryExpiryFields from '@/components/PantryExpiryFields';
import { expiryDraft, expirySelection, resolveExpiry } from '@/lib/pantryExpiry';
import { NeonAuthError } from '@/lib/neonAuth';
import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import { useMockPantry } from '@/context/MockPantryContext';
import { PANTRY_CATEGORIES, type PantryDraft } from '@/lib/pantry';
import { Colors } from '@/constants/Theme';
import { MOCK_CURRENCY } from '@/lib/mock';
import { useRealPantry } from '@/context/RealPantryContext';
import type { PantryCreateInput, PantryItemDto } from '@/types/api';
import { manualPantryInput, pantryRetryKey, rupeeValue } from '@/lib/pantryApi';
import useAuthRequest from '@/features/auth/useAuthRequest';

/** Supporting form styled from the supplied design system; no separate add image exists. */
export default function PantryAddScreen() {
  const { addItem } = useMockPantry();
  const real = useRealPantry();
  const [draft, setDraft] = useState<PantryDraft>({ name: '', quantity: '1', unit: '',
    expiresOn: '', category: 'Produce', price: '' });
  const [expiry, setExpiry] = useState(expiryDraft());
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const request = useAuthRequest(setError);
  const attempt = useRef<PantryCreateInput | null>(null);
  const [duplicateReview, setDuplicateReview] = useState<{ input: PantryCreateInput; matches: PantryItemDto[]; total: number } | null>(null);
  const save = async (input: PantryCreateInput, isMounted: () => boolean) => {
    attempt.current = input; // An uncertain save retries its exact payload/key without another preflight.
    try {
      const item = await real.add(input, retryKey.current);
      if (isMounted()) { submitted.current = true; setSavedId(item.id); }
    } catch (error) {
      if (error instanceof NeonAuthError && error.code === 'PANTRY_DUPLICATE') {
        attempt.current = null;
        const review = await real.duplicates(input);
        if (isMounted()) setDuplicateReview({ input, ...review });
      } else throw error;
    }
  };
  const retryKey = useRef(`entry-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  const change = <K extends keyof PantryDraft>(field: K, value: PantryDraft[K]) => {
    if (request.loading) return;
    attempt.current = null;
    setDraft((previous) => ({ ...previous, [field]: value })); setError(null);
    retryKey.current = `entry-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  };
  const cancel = () => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/pantry');
  return <PrototypeScreen back={savedId ? () => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } }) : duplicateReview ? () => { if (!request.loading) { setDuplicateReview(null); setError(null); } } : cancel}>
    <Text accessibilityRole="header" style={ui.title}>Add Pantry Item</Text>
    {real.enabled && real.readOnly && <Text style={ui.text}>Cached Pantry is read-only. Return to Pantry and refresh online before adding.</Text>}
    {savedId ? <View style={ui.card}>
      <Text style={ui.heading}>✓ Added to your pantry</Text><Text style={ui.text}>{draft.name.trim()} is ready to track.</Text>
      <PrimaryButton label="View Pantry" onPress={() => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } })} />
      <PrimaryButton label="View Item Details" variant="ghost" onPress={() => router.replace({ pathname: '/pantry/[id]', params: { id: savedId, added: savedId } })} />
    </View> : duplicateReview ? <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.heading}>Possible Duplicate</Text>
      <Text style={ui.text}>{duplicateReview.total} active purchases match this name, category and expiry date. These may be separate purchases.</Text>
      {duplicateReview.matches.map(item => <View key={item.id} style={ui.card}>
        <Text style={ui.heading}>{item.name}</Text>
        <Text style={ui.text}>{item.quantity} {item.unit} · {item.expiresOn} · {rupeeValue(item.totalCostMinor)}</Text>
      </View>)}
      {duplicateReview.total > duplicateReview.matches.length && <Text style={ui.text}>Showing the five most recent matches. All existing purchases will be kept.</Text>}
      <Text style={ui.text}>Add this as a new purchase? Existing entries and their history stay unchanged.</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Add Separately" disabled={real.readOnly} loading={request.loading} onPress={() => {
        if (submitted.current) return;
        setError(null);
        void request.run(async isMounted => {
          if (!attempt.current) retryKey.current = pantryRetryKey();
          await save(attempt.current ?? { ...duplicateReview.input, duplicateConfirmation: { confirmed: true, action: 'add_separately' } }, isMounted);
        });
      }} />
      <PrimaryButton label="Cancel" variant="ghost" disabled={request.loading} onPress={() => { setDuplicateReview(null); setError(null); }} />
    </View> : <View style={ui.card}>
      <FormInput label="Item name" accessibilityLabel="Item name" value={draft.name} onChangeText={(value) => change('name', value)} maxLength={120} />
      <Text style={ui.heading}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PANTRY_CATEGORIES.map((category) => <Pressable key={category.name} accessibilityRole="radio"
          accessibilityLabel={category.name} accessibilityState={{ checked: draft.category === category.name }}
          onPress={() => change('category', category.name)}
          style={[ui.pill, draft.category === category.name && { backgroundColor: Colors.primary }]}>
          <Text style={[ui.label, draft.category === category.name && { color: Colors.white }]}>{category.emoji} {category.name}</Text>
        </Pressable>)}
      </View>
      <FormInput label="Quantity" accessibilityLabel="Quantity" keyboardType="decimal-pad" value={draft.quantity} onChangeText={(value) => change('quantity', value)} />
      <FormInput label="Unit (e.g. bag, kg, bottle)" accessibilityLabel="Unit" value={draft.unit} onChangeText={(value) => change('unit', value)} maxLength={real.enabled ? 32 : 40} />
      {real.enabled ? <PantryExpiryFields name={draft.name} category={draft.category.toUpperCase() as Parameters<typeof PantryExpiryFields>[0]['category']}
        value={expiry} disabled={request.loading} onChange={value => {
          if (request.loading) return;
          attempt.current = null; setExpiry(value); setError(null); retryKey.current = `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }} /> : <><FormInput label="Expiry date (YYYY-MM-DD)" accessibilityLabel="Expiry date" placeholder="YYYY-MM-DD"
        autoCapitalize="none" maxLength={10} value={draft.expiresOn} onChangeText={(value) => change('expiresOn', value)} />
      <Text style={ui.text}>Enter the date you want to track. Past dates are allowed for items needing reconciliation.</Text></>}
      <FormInput label={`Purchase value (${real.enabled ? '₹' : MOCK_CURRENCY.symbol}, optional)`} accessibilityLabel="Purchase value" keyboardType="decimal-pad"
        value={draft.price} onChangeText={(value) => change('price', value)} placeholder="Unknown" />
      <Text style={ui.text}>{real.enabled ? 'Value of this whole entry in rupees, not per unit. Leave blank for unknown; zero means free.' : 'Value of this whole entry, not per unit. Unknown values count as $0 in this prototype.'}</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Add to Pantry" disabled={real.enabled && real.readOnly} loading={request.loading} onPress={() => {
        if (submitted.current) return;
        if (real.enabled) {
          setError(null);
          void request.run(async isMounted => {
            if (attempt.current) { await save(attempt.current, isMounted); return; }
            let resolved;
            try { resolved = resolveExpiry(expirySelection(expiry)); } catch (error) { throw new NeonAuthError('INVALID_REQUEST', (error as Error).message); }
            const input = { ...manualPantryInput({ ...draft, expiresOn: resolved.expiresOn }), expirySelection: resolved.selection };
            const review = await real.duplicates(input);
            if (!isMounted()) return;
            if (review.total) { setDuplicateReview({ input, ...review }); return; }
            await save(input, isMounted);
          });
          return;
        }
        const result = addItem(draft);
        if (result.error) { setError(result.error); return; }
        submitted.current = true; setSavedId(result.id);
      }} />
      <PrimaryButton label="Cancel" variant="ghost" onPress={cancel} />
      <Text style={ui.text}>{real.enabled ? 'Saved to your household. Expiry days use Asia/Kolkata. If a save times out, retry the unchanged form.' : 'Saved for this demo session. Reloading resets the pantry.'}</Text>
    </View>}
  </PrototypeScreen>;
}
