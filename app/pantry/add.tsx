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

/** Supporting form styled from the supplied design system; no separate add image exists. */
export default function PantryAddScreen() {
  const { addItem } = useMockPantry();
  const [draft, setDraft] = useState<PantryDraft>({ name: '', quantity: '1', unit: '',
    expiresOn: '', category: 'Produce', price: '' });
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const change = <K extends keyof PantryDraft>(field: K, value: PantryDraft[K]) => {
    setDraft((previous) => ({ ...previous, [field]: value })); setError(null);
  };
  const cancel = () => router.canGoBack() ? router.back() : router.dismissTo('/(tabs)/pantry');
  return <PrototypeScreen back={savedId ? () => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } }) : cancel}>
    <Text accessibilityRole="header" style={ui.title}>Add Pantry Item</Text>
    {savedId ? <View style={ui.card}>
      <Text style={ui.heading}>✓ Added to your pantry</Text><Text style={ui.text}>{draft.name.trim()} is ready to track.</Text>
      <PrimaryButton label="View Pantry" onPress={() => router.dismissTo({ pathname: '/(tabs)/pantry', params: { added: savedId } })} />
      <PrimaryButton label="View Item Details" variant="ghost" onPress={() => router.replace({ pathname: '/pantry/[id]', params: { id: savedId, added: savedId } })} />
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
      <FormInput label="Unit (e.g. bag, kg, bottle)" accessibilityLabel="Unit" value={draft.unit} onChangeText={(value) => change('unit', value)} maxLength={40} />
      <FormInput label="Expiry date (YYYY-MM-DD)" accessibilityLabel="Expiry date" placeholder="YYYY-MM-DD"
        autoCapitalize="none" maxLength={10} value={draft.expiresOn} onChangeText={(value) => change('expiresOn', value)} />
      <Text style={ui.text}>Enter the date you want to track. Past dates are allowed for items needing reconciliation.</Text>
      <FormInput label={`Purchase value (${MOCK_CURRENCY.symbol}, optional)`} accessibilityLabel="Purchase value" keyboardType="decimal-pad"
        value={draft.price} onChangeText={(value) => change('price', value)} placeholder="Unknown" />
      <Text style={ui.text}>Value of this whole entry, not per unit. Unknown values count as $0 in this prototype.</Text>
      {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
      <PrimaryButton label="Add to Pantry" onPress={() => {
        if (submitted.current) return;
        const result = addItem(draft);
        if (result.error) { setError(result.error); return; }
        submitted.current = true; setSavedId(result.id);
      }} />
      <PrimaryButton label="Cancel" variant="ghost" onPress={cancel} />
      <Text style={ui.text}>Saved for this demo session. Reloading resets the pantry.</Text>
    </View>}
  </PrototypeScreen>;
}
