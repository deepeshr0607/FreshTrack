/**
 * Pantry / Kitchen Inventory screen
 * Design reference: design-reference/kitchen_inventory_swipe_actions/screen.png
 */
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import PantryItemCard from '@/components/PantryItemCard';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import { MOCK_PANTRY_ITEMS, type PantryItem } from '@/lib/mock';

type FilterChip = 'All' | 'Critical' | 'Caution' | 'Fresh';
type SortMode = 'expiry' | 'name' | 'category';

const FILTER_CHIPS: { key: FilterChip; label: string; color: string }[] = [
  { key: 'All', label: 'All Items', color: Colors.primary },
  { key: 'Critical', label: '🔴 Critical', color: Colors.criticalRose },
  { key: 'Caution', label: '🟡 Caution', color: Colors.cautionAmber },
  { key: 'Fresh', label: '🟢 Fresh', color: Colors.freshGreen },
];

export default function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>(MOCK_PANTRY_ITEMS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterChip>('All');
  const [sort, setSort] = useState<SortMode>('expiry');

  const filtered = items
    .filter((i) => i.status === 'ACTIVE')
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => {
      if (filter === 'All') return true;
      if (filter === 'Critical') return i.daysLeft <= 1;
      if (filter === 'Caution') return i.daysLeft >= 2 && i.daysLeft <= 6;
      if (filter === 'Fresh') return i.daysLeft >= 7;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'expiry') return a.daysLeft - b.daysLeft;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

  const totalValue = filtered.reduce((sum, i) => sum + i.price, 0);
  const criticalCount = items.filter((i) => i.daysLeft <= 1 && i.status === 'ACTIVE').length;

  const handleConsume = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'CONSUMED' as const } : i)),
    );
    Alert.alert('✓ Marked as Used', 'Great — no food wasted! 🌿');
  };

  const handleWaste = (id: string) => {
    Alert.alert(
      'Mark as Wasted',
      'This will log the item as food waste and track the cost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Waste',
          style: 'destructive',
          onPress: () => {
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, status: 'WASTED' as const } : i)),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="FreshTrack" subtitle="Pantry" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section title */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Kitchen Inventory</Text>
          <Text style={styles.itemCount}>{filtered.length} items</Text>
        </View>

        {/* Dual-Tier Freshness Engine banner */}
        <View style={styles.freshnessEngineBanner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerTitle}>⚙️ Dual-Tier Freshness Engine™</Text>
            <Text style={styles.bannerSub}>
              AI tracking with{' '}
              <Text style={{ color: Colors.smartAzure }}>✦ adaptive estimates</Text> +{' '}
              <Text style={{ color: Colors.freshGreen }}>✓ package dates</Text>
            </Text>
          </View>
          <View style={styles.bannerAlertPill}>
            <Text style={styles.bannerAlertText}>
              {criticalCount > 0 ? `⚠️ ${criticalCount} critical` : '✓ All tracked'}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search pantry items..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search pantry items"
          />
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {FILTER_CHIPS.map((chip) => (
            <Pressable
              key={chip.key}
              style={[styles.chip, filter === chip.key && { backgroundColor: chip.color }]}
              onPress={() => setFilter(chip.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: filter === chip.key }}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === chip.key && styles.chipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          ))}

          {/* Sort toggle */}
          <Pressable
            style={[styles.chip, styles.sortChip]}
            onPress={() => {
              const modes: SortMode[] = ['expiry', 'name', 'category'];
              setSort((cur) => modes[(modes.indexOf(cur) + 1) % modes.length]!);
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle sort order"
          >
            <Text style={styles.chipText}>
              ↕ {sort === 'expiry' ? 'Expiry' : sort === 'name' ? 'Name' : 'Category'}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Value at stake */}
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>📊 Value tracked:</Text>
          <Text style={styles.valueAmount}>${totalValue.toFixed(2)}</Text>
          {criticalCount > 0 && (
            <Text style={styles.atRisk}>
              · <Text style={{ color: Colors.criticalRose }}>${
                items
                  .filter((i) => i.daysLeft <= 1 && i.status === 'ACTIVE')
                  .reduce((s, i) => s + i.price, 0)
                  .toFixed(2)
              } at risk</Text>
            </Text>
          )}
        </View>

        {/* Items list */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥦</Text>
            <Text style={styles.emptyTitle}>
              {search ? `No items matching "${search}"` : 'No items in this category'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? 'Try a different search term'
                : 'Scan a receipt or add an item manually'}
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/pantry/${item.id}` as any)}
              onConsume={handleConsume}
              onWaste={handleWaste}
            />
          ))
        )}

        {/* Add item FAB hint */}
        <Pressable
          style={styles.addHint}
          onPress={() => router.push('/(tabs)/scanner' as any)}
          accessibilityRole="button"
          accessibilityLabel="Scan receipt or barcode to add items"
        >
          <Text style={styles.addHintText}>
            📷 Scan receipt or barcode to add items →
          </Text>
        </Pressable>

        {/* Bottom nav clearance */}
        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenGutter },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.base,
  },
  screenTitle: {
    fontSize: FontSize.headlineLg,
    fontWeight: FontWeight.extrabold,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  itemCount: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  freshnessEngineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  bannerLeft: { flex: 1, marginRight: Spacing.sm },
  bannerTitle: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  bannerSub: { fontSize: FontSize.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  bannerAlertPill: {
    backgroundColor: Colors.cautionAmberBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  bannerAlertText: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.cautionAmber,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSize.bodyMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  chipsScroll: { marginBottom: Spacing.sm, marginHorizontal: -Spacing.screenGutter },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.screenGutter,
  },
  chip: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  sortChip: {
    borderStyle: 'dashed',
  },
  chipText: {
    fontSize: FontSize.labelMd,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
    whiteSpace: 'nowrap',
  } as any,
  chipTextActive: {
    color: Colors.onPrimary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  valueLabel: { fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  valueAmount: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  atRisk: { fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl3,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  addHint: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
  },
  addHintText: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
