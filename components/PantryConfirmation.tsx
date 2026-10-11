import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/Theme';
import type { PantryItem } from '@/lib/mock';
import PrimaryButton from './PrimaryButton';

interface Props {
  item: PantryItem | null;
  action: 'CONSUMED' | 'WASTED';
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PantryConfirmation({ item, action, onCancel, onConfirm }: Props) {
  const wasted = action === 'WASTED';
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>
              {wasted ? 'Mark as Wasted?' : 'Mark as Used?'}
            </Text>
            <Text style={styles.body}>
              {item?.name} · {item?.quantity} {item?.unit}
            </Text>
            <Text style={styles.body}>
              {wasted ? 'Remove this item from your active inventory as food waste.' :
                'Remove this item from your active inventory as consumed.'}
            </Text>
            <PrimaryButton label={wasted ? 'Confirm Waste' : 'Confirm Used'} onPress={onConfirm} />
            <PrimaryButton label="Cancel" variant="ghost" onPress={onCancel} />
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
