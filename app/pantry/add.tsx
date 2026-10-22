import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import CalendarDateField from '@/components/CalendarDateField';
import PantryExpiryFields from '@/components/PantryExpiryFields';
import { expiryDraft, expirySelection, resolveExpiry } from '@/lib/pantryExpiry';
import { NeonAuthError } from '@/lib/neonAuth';
import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import BarcodeEntryGate, { type BarcodeEntryProps } from '@/features/scanner/BarcodeEntryGate';
import { cleanBarcodeInput, type BarcodeIntent } from '@/lib/barcodeEntry';
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
  const params = useLocalSearchParams<{ barcode?: string; barcodeRetry?: string }>();
  return params.barcode || params.barcodeRetry ? <BarcodeEntryGate code={params.barcode} render={entry => <PantryAddForm barcodeEntry={entry} />} /> : <PantryAddForm />;
}
function PantryAddForm({ barcodeEntry }: { barcodeEntry?: BarcodeEntryProps }) {
  const { addItem } = useMockPantry();
  const real = useRealPantry();
  const restored = barcodeEntry?.pending?.input;
  const [draft, setDraft] = useState<PantryDraft>(restored ? { name: restored.name, quantity: restored.quantity, unit: restored.unit,
    expiresOn: restored.expiresOn, category: (restored.category[0] + restored.category.slice(1).toLowerCase()) as PantryDraft['category'],
    price: restored.totalCostMinor === null ? '' : (restored.totalCostMinor / 100).toFixed(2) } : { name: barcodeEntry?.catalog?.product?.name ?? '', quantity: '1', unit: '',
    expiresOn: '', category: barcodeEntry ? 'Other' : 'Produce', price: '' });
  const [expiry, setExpiry] = useState(restored ? { packageDate: restored.expirySelection?.packageDate ?? '',
    userDate: restored.expirySelection?.userDate ?? (restored.expirySelection ? '' : restored.expiresOn),
    baseDate: restored.expirySelection?.preset?.baseDate ?? '', days: restored.expirySelection?.preset?.days.toString() ?? '' } : expiryDraft());
  const [categoryConfirmed, setCategoryConfirmed] = useState(!barcodeEntry || !!restored);
  const pending = useRef<BarcodeIntent | null>(barcodeEntry?.pending ?? null);
  const [frozen, setFrozen] = useState(!!restored);
  const [pauseForTest, setPauseForTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const request = useAuthRequest(setError);
  const attempt = useRef<PantryCreateInput | null>(restored ?? null);
  const [duplicateReview, setDuplicateReview] = useState<{ input: PantryCreateInput; matches: PantryItemDto[]; total: number } | null>(null);
  const save = async (input: PantryCreateInput, isMounted: () => boolean) => {
    if (barcodeEntry) {
      const freshIntent = !pending.current;
      try {
        pending.current ??= await barcodeEntry.storage.save(input, retryKey.current);
        input = pending.current.input; retryKey.current = pending.current.key;
        if (isMounted()) setFrozen(true);
      } catch {
        pending.current = await barcodeEntry.storage.load().catch(() => null);
        if (pending.current && isMounted()) setFrozen(true);
        throw new NeonAuthError('BARCODE_STORAGE', 'The confirmed purchase could not be saved safely for retry. Return to Scanner → Resume Barcode Save before trying again.');
      }
      if (DIAGNOSTICS_ENABLED && pauseForTest && freshIntent) return; // Deliberate local-only restart diagnostic, never an automatic submit.
    }
    attempt.current = input; // An uncertain save retries its exact payload/key without another preflight.
    try {
      const item = await real.add(input, retryKey.current);
      if (barcodeEntry) {
        if (item.source !== 'BARCODE' || item.barcode !== input.barcode || !item.id) throw new NeonAuthError('BARCODE_RESPONSE', 'The saved barcode purchase could not be verified. Retry the same saved purchase.');
        try { await barcodeEntry.storage.clear(retryKey.current); }
        catch { throw new NeonAuthError('BARCODE_STORAGE', 'The purchase was saved, but its local retry could not be cleared. Retry to verify the same purchase.'); }
        pending.current = null;
      }
      if (isMounted()) { submitted.current = true; setSavedId(item.id); }
    } catch (error) {
      if (error instanceof NeonAuthError && error.code === 'PANTRY_DUPLICATE') {
        if (barcodeEntry) { await barcodeEntry.storage.clear(retryKey.current); pending.current = null; if (isMounted()) setFrozen(false); }
        attempt.current = null;
        const review = await real.duplicates(input);
        if (isMounted()) setDuplicateReview({ input, ...review });
      } else throw error;
    }
  };
  const retryKey = useRef(barcodeEntry?.pending?.key ?? pantryRetryKey());
  const change = <K extends keyof PantryDraft>(field: K, value: PantryDraft[K]) => {
    if (request.loading || frozen) return;
    attempt.current = null;
    setDraft((previous) => ({ ...previous, [field]: value })); setError(null);
    retryKey.current = `entry-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  };
  const cancel = () => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/pantry');
  return <PrototypeScreen back={savedId ? () => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } }) : duplicateReview ? () => { if (!request.loading) { setDuplicateReview(null); setError(null); } } : cancel}>
    <Text accessibilityRole="header" style={ui.title}>Add Pantry Item</Text>
    {barcodeEntry && <View style={ui.card}><Text style={ui.heading}>Barcode purchase · Review before saving</Text>
      <Text selectable style={ui.text}>{barcodeEntry.code}</Text>
      <Text style={ui.text}>{barcodeEntry.catalog?.product ? `Open Food Facts · ODbL · Community data, unverified. Brand: ${barcodeEntry.catalog.product.brand ?? 'Unknown'}. Package size: ${barcodeEntry.catalog.product.packageSize ?? 'Unknown'}.` : 'Details supplied by you. The barcode identifies the product, not its purchase value or expiry.'}</Text>
      <Text style={ui.text}>Confirm your quantity, unit and Pantry category. Enter the whole purchase value and package/manual expiry, or choose an explicit shelf-life start date and duration. No date or price is inferred.</Text></View>}
    {real.enabled && real.readOnly && <Text style={ui.text}>Cached Pantry is read-only. Return to Pantry and refresh online before adding.</Text>}
    {savedId ? <View style={ui.card}>
      <Text style={ui.heading}>✓ Added to your pantry</Text><Text style={ui.text}>{barcodeEntry ? 'This purchase is saved. Open its details to check the current status.' : `${draft.name.trim()} is ready to track.`}</Text>
      <PrimaryButton label="View Pantry" onPress={() => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } })} />
      <PrimaryButton label="View Item Details" variant="ghost" onPress={() => router.replace({ pathname: '/pantry/[id]', params: { id: savedId, added: savedId } })} />
    </View> : frozen && barcodeEntry ? <View style={ui.card}>
      <Text style={ui.heading}>Confirmed barcode purchase saved for retry</Text>
      <Text style={ui.text}>{pending.current?.input.name ?? draft.name} · {pending.current?.input.quantity} {pending.current?.input.unit} · {pending.current?.input.expiresOn} · {rupeeValue(pending.current?.input.totalCostMinor ?? null)}</Text>
      <Text style={ui.text}>This purchase may already be saved online. Retry this exact purchase to check; its fields and request key stay unchanged across restart. Signing out removes the local retry.</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Retry Saved Barcode Purchase" disabled={real.readOnly} loading={request.loading} onPress={() => { if (pending.current) void request.run(active => save(pending.current!.input, active)); }} />
      <PrimaryButton label="Return to Pantry" variant="ghost" disabled={request.loading} onPress={() => router.dismissTo('/(tabs)/pantry')} />
    </View> : duplicateReview ? <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.heading}>Possible Duplicate</Text>
      <Text style={ui.text}>{duplicateReview.total} active purchases match {barcodeEntry ? 'this barcode, or this name/category/expiry' : 'this name, category and expiry date'}. These may be separate purchases.</Text>
      {duplicateReview.matches.map(item => <View key={item.id} style={ui.card}>
        <Text style={ui.heading}>{item.name}</Text>
        <Text style={ui.text}>{item.quantity} {item.unit} · {item.expiresOn} · {rupeeValue(item.totalCostMinor)}</Text>
      </View>)}
      {duplicateReview.total > duplicateReview.matches.length && <Text style={ui.text}>Showing the five most recent matches. All existing purchases will be kept.</Text>}
      <Text style={ui.text}>Add this as a new purchase? Existing entries and their history stay unchanged.</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Add Separately" disabled={real.readOnly} loading={request.loading} onPress={() => {
        if (submitted.current || request.loading) return;
        setError(null);
        void request.run(async isMounted => {
          if (!attempt.current) retryKey.current = pantryRetryKey();
          await save(attempt.current ?? { ...duplicateReview.input, duplicateConfirmation: { confirmed: true, action: 'add_separately' } }, isMounted);
        });
      }} />
      <PrimaryButton label="Cancel" variant="ghost" disabled={request.loading} onPress={() => { setDuplicateReview(null); setError(null); }} />
    </View> : <View style={ui.card}>
      <FormInput label="Item name" accessibilityLabel="Item name" value={draft.name} onChangeText={(value) => change('name', value)} maxLength={120} editable={!request.loading} />
      <Text style={ui.heading}>Category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PANTRY_CATEGORIES.map((category) => <Pressable key={category.name} accessibilityRole="radio"
          accessibilityLabel={category.name} accessibilityState={{ checked: categoryConfirmed && draft.category === category.name }}
          onPress={() => { if (!request.loading) { setCategoryConfirmed(true); change('category', category.name); } }}
          style={[ui.pill, categoryConfirmed && draft.category === category.name && { backgroundColor: Colors.primary }]}>
          <Text style={[ui.label, categoryConfirmed && draft.category === category.name && { color: Colors.white }]}>{category.emoji} {category.name}</Text>
        </Pressable>)}
      </View>
      <FormInput label="Quantity" accessibilityLabel="Quantity" keyboardType="decimal-pad" value={draft.quantity} onChangeText={(value) => change('quantity', value)} />
      <FormInput label="Unit (e.g. bag, kg, bottle)" accessibilityLabel="Unit" value={draft.unit} onChangeText={(value) => change('unit', value)} maxLength={real.enabled ? 32 : 40} />
      {real.enabled ? <PantryExpiryFields simple name={draft.name} category={draft.category.toUpperCase() as Parameters<typeof PantryExpiryFields>[0]['category']}
        value={expiry} disabled={request.loading} onChange={value => {
          if (request.loading) return;
          attempt.current = null; setExpiry(value); setError(null); retryKey.current = `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }} /> : <><CalendarDateField value={draft.expiresOn} onChange={(value) => change('expiresOn', value)} />
      <Text style={ui.text}>Enter the date you want to track. Past dates are allowed for items needing reconciliation.</Text></>}
      <FormInput label={`Purchase value (${real.enabled ? '₹' : MOCK_CURRENCY.symbol}, optional)`} accessibilityLabel="Purchase value" keyboardType="decimal-pad"
        value={draft.price} onChangeText={(value) => change('price', value)} placeholder="Unknown" />
      <Text style={ui.text}>{real.enabled ? 'Value of this whole entry in rupees, not per unit. Leave blank for unknown; zero means free.' : 'Value of this whole entry, not per unit. Unknown values count as $0 in this prototype.'}</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      {DIAGNOSTICS_ENABLED && barcodeEntry && <><Text style={ui.text}>{pauseForTest ? 'Restart test: the next confirmation will be saved on this phone only. Use Retry Saved Barcode Purchase to submit it.' : 'Development diagnostic: optionally pause the next confirmed barcode save before sending.'}</Text>
        <PrimaryButton label={pauseForTest ? 'End Barcode Pause Test' : 'Pause Barcode Save (Test)'} variant="ghost" disabled={request.loading} onPress={() => setPauseForTest(value => !value)} /></>}
      <PrimaryButton label="Add to Pantry" disabled={real.enabled && real.readOnly} loading={request.loading} onPress={() => {
        if (submitted.current) return;
        if (real.enabled) {
          setError(null);
          void request.run(async isMounted => {
            if (attempt.current) { await save(attempt.current, isMounted); return; }
            if (!categoryConfirmed) throw new NeonAuthError('INVALID_REQUEST', 'Choose a Pantry category for this barcode purchase.');
            let resolved;
            try { resolved = resolveExpiry(expirySelection(expiry)); } catch (error) { throw new NeonAuthError('INVALID_REQUEST', (error as Error).message); }
            const fields = { ...manualPantryInput({ ...draft, expiresOn: resolved.expiresOn }), expirySelection: resolved.selection };
            let input = fields as PantryCreateInput;
            if (barcodeEntry) {
              try { input = cleanBarcodeInput({ ...fields, barcode: barcodeEntry.code }); }
              catch { throw new NeonAuthError('INVALID_REQUEST', 'Review the item name (1–120 characters), unit, quantity, purchase value and expiry before saving.'); }
            }
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
      <PrimaryButton label="Cancel" variant="ghost" disabled={request.loading} onPress={cancel} />
      <Text style={ui.text}>{real.enabled ? 'Saved to your household. Expiry days use Asia/Kolkata. If a save times out, retry the unchanged form.' : 'Saved for this demo session. Reloading resets the pantry.'}</Text>
    </View>}
  </PrototypeScreen>;
}
