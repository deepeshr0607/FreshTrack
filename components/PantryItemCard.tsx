/**
 * PantryItemCard.tsx — Grocery item card with freshness bar.
 *
 * Design reference: design-reference/kitchen_inventory_swipe_actions/screen.png
 * - Level 1 elevation card (white bg, hairline border, soft shadow)
 * - 48×48px emoji thumbnail on left
 * - Name, category/source badge, price
 * - Days-remaining badge aligned right
 * - 4px freshness bar across the bottom
 * - Swipe actions: right = consumed (green), left = wasted (red)
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '../constants/Theme';
import ExpiryBadge from './ExpiryBadge';
import FreshnessBar from './FreshnessBar';
import type { PantryItem } from '../lib/mock';

interface Props {
  item: PantryItem;
  onPress?: () => void;
  onConsume?: (id: string) => void;
  onWaste?: (id: string) => void;
}

export default function PantryItemCard({ item, onPress, onConsume, onWaste }: Props) {
  const sourceLabel =
    item.expirySource === 'PACKAGE_DATE'
      ? '✓ Confirmed'
      : item.expirySource === 'USER_ENTERED'
      ? 'User set'
      : '✦ Estimated';

  const sourceColor =
    item.expirySource === 'PACKAGE_DATE' ? Colors.freshGreen : Colors.smartAzure;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.daysLeft} days left`}
    >
      {/* Main content row */}
      <View style={styles.row}>
        {/* Emoji thumbnail */}
        <View style={styles.thumb}>
          <Text style={styles.emoji}>{item.imageEmoji}</Text>
        </View>

        {/* Info block */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.source, { color: sourceColor }]}>{sourceLabel}</Text>
            <Text style={styles.dot}> · </Text>
            <Text style={styles.meta}>₹{item.price.toFixed(2)}</Text>
            <Text style={styles.dot}> · </Text>
            <Text style={styles.meta}>{item.category}</Text>
          </View>
        </View>

        {/* Expiry badge */}
        <ExpiryBadge daysLeft={item.daysLeft} expirySource={item.expirySource} compact />
      </View>

      {/* Freshness bar */}
      <View style={styles.barRow}>
        <FreshnessBar daysLeft={item.daysLeft} />
      </View>

      {/* Quick action buttons (shown as accessible fallback for swipe) */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onConsume?.(item.id)}
          style={[styles.actionBtn, styles.consumeBtn]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as consumed`}
        >
          <Text style={[styles.actionText, { color: Colors.freshGreen }]}>✓ Used</Text>
        </Pressable>
        <Pressable
          onPress={() => onWaste?.(item.id)}
          style={[styles.actionBtn, styles.wasteBtn]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as wasted`}
        >
          <Text style={[styles.actionText, { color: Colors.criticalRose }]}>🗑 Wasted</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Elevation.card,
  },
  cardPressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  source: {
    fontSize: FontSize.bodySm,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  dot: {
    fontSize: FontSize.bodySm,
    color: Colors.outlineVariant,
  },
  meta: {
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  barRow: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  consumeBtn: {
    borderRightWidth: 0.5,
    borderRightColor: '#F1F5F9',
  },
  wasteBtn: {},
  actionText: {
    fontSize: FontSize.labelMd,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
