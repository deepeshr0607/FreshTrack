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
import React, { useRef } from 'react';
import { Pressable as NativePressable, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '../constants/Theme';
import ExpiryBadge from './ExpiryBadge';
import FreshnessBar from './FreshnessBar';
import type { PantryItem } from '../lib/mock';

interface Props {
  item: PantryItem;
  onPress?: () => void;
  onSelect?: () => void;
  selected?: boolean;
  onConsume?: (id: string) => void;
  onWaste?: (id: string) => void;
  valueLabel?: string;
  hideActions?: boolean;
  packageDateLabel?: string;
}

export default function PantryItemCard({ item, onPress, onConsume, onWaste, onSelect, selected = false, valueLabel, hideActions = false, packageDateLabel = '✓ Confirmed' }: Props) {
  const swipeable = useRef<SwipeableMethods>(null);
  const swiping = useRef(false);
  const requestAction = (direction: 'right' | 'left') => {
    // Close before confirmation so cancelling always returns to an untouched row.
    swipeable.current?.close();
    if (direction === 'right') onConsume?.(item.id);
    else onWaste?.(item.id);
  };
  const actionPanel = (used: boolean) => <View accessible={false} accessibilityElementsHidden aria-hidden
    importantForAccessibility="no-hide-descendants"
    style={[styles.swipePanel, { backgroundColor: used ? Colors.primaryContainer : Colors.criticalRose }]}>
    <MaterialCommunityIcons name={used ? 'check-circle-outline' : 'trash-can-outline'} size={30} color={Colors.white} />
    <Text style={styles.swipeLabel}>{used ? 'USED' : 'WASTED'}</Text>
    <Text style={styles.swipeValue}>{valueLabel ?? `$${item.price.toFixed(2)}`} value</Text>
  </View>;
  const sourceLabel =
    item.expirySource === 'PACKAGE_DATE'
      ? packageDateLabel
      : item.expirySource === 'USER_ENTERED'
      ? 'User set'
      : '✦ Estimated';

  const sourceColor =
    item.expirySource === 'PACKAGE_DATE' ? Colors.freshGreen : Colors.smartAzure;

  // Selection uses a regular press target outside the disabled swipe gesture tree.
  const CardPressable = onSelect ? NativePressable : Pressable;
  const card = (
    <View style={[styles.card, selected && { borderColor: Colors.primary, borderWidth: 2 }]}>
      <CardPressable
        onPressIn={() => { swiping.current = false; }}
        onPress={() => { if (!swiping.current) (onSelect ?? onPress)?.(); }}
        style={({ pressed }) => [pressed && styles.cardPressed]}
        accessibilityRole={onSelect ? 'checkbox' : 'button'}
        accessibilityState={onSelect ? { checked: selected } : undefined}
        aria-checked={onSelect ? selected : undefined}
        accessibilityLabel={onSelect ? `Select ${item.name}` : `${item.name}, ${item.daysLeft} days left`}
        accessibilityHint={onSelect ? 'Select this whole entry for a confirmed batch action.' : hideActions ? 'Open item details.' : 'Open item details. Swipe right for Used or left for Wasted; both require confirmation.'}
      >
        {/* Main content row */}
        <View style={styles.row}>
          {onSelect && <MaterialCommunityIcons accessible={false} aria-hidden
            name={selected ? 'checkbox-marked-circle-outline' : 'checkbox-blank-circle-outline'} size={24} color={Colors.primary} />}
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
              <Text style={styles.meta}>{valueLabel ?? `$${item.price.toFixed(2)}`}</Text>
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
      </CardPressable>

      {/* Quick action buttons (shown as accessible fallback for swipe) */}
      {!onSelect && !hideActions && <View style={styles.actions}>
        <Pressable
          onPressIn={() => { swiping.current = false; }}
          onPress={() => { if (!swiping.current) requestAction('right'); }}
          disabled={!onConsume || item.status !== 'ACTIVE'}
          style={[styles.actionBtn, styles.consumeBtn]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as consumed`}
        >
          <Text style={[styles.actionText, { color: Colors.freshGreen }]}>✓ Used</Text>
        </Pressable>
        <Pressable
          onPressIn={() => { swiping.current = false; }}
          onPress={() => { if (!swiping.current) requestAction('left'); }}
          disabled={!onWaste || item.status !== 'ACTIVE'}
          style={[styles.actionBtn, styles.wasteBtn]}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.name} as wasted`}
        >
          <Text style={[styles.actionText, { color: Colors.criticalRose }]}>🗑 Wasted</Text>
        </Pressable>
      </View>}
    </View>
  );
  if (onSelect) return <View style={styles.swipeContainer}>{card}</View>;
  return (
    <ReanimatedSwipeable ref={swipeable} containerStyle={styles.swipeContainer}
      friction={1} leftThreshold={72} rightThreshold={72}
      dragOffsetFromLeftEdge={20} dragOffsetFromRightEdge={20}
      overshootLeft={false} overshootRight={false} enableTrackpadTwoFingerGesture
      enabled={!hideActions && !onSelect && item.status === 'ACTIVE' && !!(onConsume || onWaste)}
      renderLeftActions={onConsume ? () => actionPanel(true) : undefined}
      renderRightActions={onWaste ? () => actionPanel(false) : undefined}
      onSwipeableOpenStartDrag={() => { swiping.current = true; }}
      onSwipeableCloseStartDrag={() => { swiping.current = true; }}
      onSwipeableOpen={requestAction}>
      {card}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: Spacing.sm, borderRadius: Radius.lg, overflow: 'hidden', ...Elevation.card },
  swipePanel: { width: 128, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm },
  swipeLabel: { color: Colors.white, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: FontSize.headlineSm },
  swipeValue: { color: Colors.white, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.labelMd },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
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
