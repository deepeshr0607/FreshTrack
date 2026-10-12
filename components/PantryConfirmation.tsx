import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import type { PantryItem } from '@/lib/mock';
import PrimaryButton from './PrimaryButton';

interface Props {
  item: PantryItem | null;
  items?: PantryItem[];
  action: 'CONSUMED' | 'WASTED';
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string;
  undo?: boolean;
  currencySymbol?: string;
  unknownIds?: string[];
}

export default function PantryConfirmation({ item, items, action, onCancel, onConfirm, loading = false, error, undo = false, currencySymbol = '$', unknownIds = [] }: Props) {
  const batch = items !== undefined;
  const entries = items ?? (item ? [item] : []);
  const wasted = action === 'WASTED';
  return (
    <Modal visible={entries.length > 0} transparent animationType="slide" onRequestClose={() => { if (!loading) onCancel(); }}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>
              {undo ? `Restore ${batch ? `${entries.length} Items` : 'Item'} to Pantry?` : batch ? `Mark ${entries.length} ${entries.length === 1 ? 'Item' : 'Items'} as ${wasted ? 'Wasted' : 'Used'}?` : wasted ? 'Mark as Wasted?' : 'Mark as Used?'}
            </Text>
            {entries.map((entry) => <Text key={entry.id} style={styles.body}>
              {entry.name} · {entry.quantity} {entry.unit}{batch ? unknownIds.includes(entry.id) ? ' · Unknown value' : ` · ${currencySymbol}${entry.price.toFixed(2)}` : ''}
            </Text>)}
            {batch && <Text style={styles.body}>Total known value: {currencySymbol}{entries.reduce((total, entry) => total + entry.price, 0).toFixed(2)}. This applies to each whole entry.</Text>}
            <Text style={styles.body}>
              {undo ? 'Return these groceries to active inventory and record the correction in their history.' : batch ? `Remove these selected entries from active inventory as ${wasted ? 'food waste' : 'consumed'}.` : wasted ? 'Remove this item from your active inventory as food waste.' :
                'Remove this item from your active inventory as consumed.'}
            </Text>
            {!!error && <Text style={[styles.body, { color: Colors.error }]} accessibilityRole="alert">{error}</Text>}
            <PrimaryButton label={undo ? 'Confirm Restore' : wasted ? 'Confirm Waste' : 'Confirm Used'} loading={loading} onPress={onConfirm} />
            <PrimaryButton label="Cancel" variant="ghost" disabled={loading} onPress={onCancel} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,27,46,0.4)' },
  sheet: { backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, maxHeight: '85%' },
  content: { padding: Spacing.xl, gap: Spacing.base },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.headlineMd, color: Colors.onSurface },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodyLg, color: Colors.onSurfaceVariant },
});
