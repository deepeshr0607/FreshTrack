/** Compact Home inventory card, preserving the supplied Recent Additions layout. */
import React, { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import type { PantryItem } from '@/lib/mock';
import FreshnessBar from './FreshnessBar';

type Outcome = 'CONSUMED' | 'WASTED';
interface Props {
  item: PantryItem;
  onPress: () => void;
  onRequestStatus: (id: string, action: Outcome) => void;
}

export default function RecentPantryItemCard({ item, onPress, onRequestStatus }: Props) {
  const swipeable = useRef<SwipeableMethods>(null);
  const swiping = useRef(false);
  const request = (direction: 'right' | 'left') => {
    swipeable.current?.close();
    onRequestStatus(item.id, direction === 'right' ? 'CONSUMED' : 'WASTED');
  };
  const panel = (used: boolean) => (
    <View accessible={false} accessibilityElementsHidden aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.panel, { backgroundColor: used ? Colors.primaryContainer : Colors.criticalRose }]}>
      <Text style={styles.panelText}>{used ? '✓ USED' : 'WASTED'}</Text>
      <Text style={styles.panelText}>${item.price.toFixed(2)} value</Text>
    </View>
  );
  return (
    <ReanimatedSwipeable ref={swipeable} containerStyle={styles.container}
      friction={1} leftThreshold={72} rightThreshold={72}
      dragOffsetFromLeftEdge={20} dragOffsetFromRightEdge={20}
      overshootLeft={false} overshootRight={false} enableTrackpadTwoFingerGesture
      enabled={item.status === 'ACTIVE'}
      renderLeftActions={() => panel(true)} renderRightActions={() => panel(false)}
      onSwipeableOpenStartDrag={() => { swiping.current = true; }}
      onSwipeableCloseStartDrag={() => { swiping.current = true; }}
      onSwipeableOpen={request}>
      <View style={styles.surface}>
        <Pressable style={styles.recentCard}
          onPressIn={() => { swiping.current = false; }}
          onPress={() => { if (!swiping.current) onPress(); }}
          accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.daysLeft} days left`}
          accessibilityHint="Open item details. Swipe right for Used or left for Wasted; both require confirmation.">
          <View style={styles.recentThumb}><Text style={{ fontSize: 26 }}>{item.imageEmoji}</Text></View>
          <View style={styles.recentInfo}>
            <Text style={styles.recentName}>{item.name}</Text>
            <Text style={styles.recentMeta}>
              {item.category} · {item.source === 'MANUAL' ? 'Added manually' : item.source === 'BARCODE' ? 'Added from barcode' : item.source === 'RECEIPT' ? 'Added from receipt' : `Scanned ${item.daysLeft < 1 ? 'today' : `${item.daysLeft}h ago`}`}
            </Text>
          </View>
          <View style={styles.recentRight}>
            <Text style={styles.recentDays}>{item.daysLeft} days</Text>
            <Text style={styles.recentPrice}>${item.price.toFixed(2)}</Text>
          </View>
          <View style={styles.recentBarFull}><FreshnessBar daysLeft={item.daysLeft} /></View>
        </Pressable>
        <View style={styles.actions}>
          {(['right', 'left'] as const).map((direction) => (
            <Pressable key={direction} style={styles.action}
              onPressIn={() => { swiping.current = false; }}
              onPress={() => { if (!swiping.current) request(direction); }}
              disabled={item.status !== 'ACTIVE'} accessibilityRole="button"
              accessibilityLabel={`Mark ${item.name} as ${direction === 'right' ? 'consumed' : 'wasted'}`}>
              <Text style={[styles.actionText, { color: direction === 'right' ? Colors.freshGreen : Colors.criticalRose }]}>
                {direction === 'right' ? '✓ Used' : 'Wasted'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm, borderRadius: Radius.lg, overflow: 'hidden', ...Elevation.card },
  surface: { backgroundColor: Colors.surfaceContainerLowest },
  panel: { width: 128, justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm },
  panelText: { color: Colors.white, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.labelMd },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.sm },
  action: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  actionText: { fontSize: FontSize.labelSm, fontFamily: 'PlusJakartaSans_600SemiBold' },
  recentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexWrap: 'wrap',
  },
  recentThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentName: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  recentMeta: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  recentRight: { alignItems: 'flex-end' },
  recentDays: {
    fontSize: FontSize.labelLg,
    fontWeight: FontWeight.bold,
    color: Colors.cautionAmber,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  recentPrice: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant },
  recentBarFull: { width: '100%' },

});
