import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import FormInput from '@/components/FormInput';
import PrimaryButton from '@/components/PrimaryButton';
import ExpiryBadge from '@/components/ExpiryBadge';
import PantryConfirmation from '@/components/PantryConfirmation';
import { useMockPantry } from '@/context/MockPantryContext';
import { Colors, Elevation, FontSize, Radius, Spacing } from '@/constants/Theme';
import { validatePantryEdit, type PantryEdit } from '@/lib/pantry';
import type { PantryItem } from '@/lib/mock';

function backToPantry(added?: string) {
  router.dismissTo(added ? { pathname: '/(tabs)/pantry', params: { added } } : '/(tabs)/pantry');
}

export default function PantryDetailScreen() {
  const { id, added } = useLocalSearchParams<{ id: string; added?: string }>();
  const { items } = useMockPantry();
  const item = items.find((entry) => entry.id === id);
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={() => backToPantry(added)} style={styles.back}>
            <Text style={styles.link}>← Back to Pantry</Text>
          </Pressable>
          {item ? <ItemEditor key={item.id} item={item} /> : (
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
