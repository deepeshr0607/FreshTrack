/**
 * Pantry / Kitchen Inventory screen
 * Design reference: design-reference/kitchen_inventory_swipe_actions/screen.png
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMockPantry } from '@/context/MockPantryContext';
import PantryConfirmation from '@/components/PantryConfirmation';
import ScreenHeader from '@/components/ScreenHeader';
import PantryItemCard from '@/components/PantryItemCard';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import type { ItemCategory, PantryItem } from '@/lib/mock';
import { PANTRY_CATEGORIES } from '@/lib/pantry';

type FilterChip = 'All' | 'Critical' | 'Caution' | 'Fresh';
type SortMode = 'expiry' | 'name' | 'category';

const FILTER_CHIPS: { key: FilterChip; label: string; color: string }[] = [
  { key: 'All', label: 'All Items', color: Colors.primary },
  { key: 'Critical', label: '🔴 Critical', color: Colors.criticalRose },
  { key: 'Caution', label: '🟡 Caution', color: Colors.cautionAmber },
  { key: 'Fresh', label: '🟢 Fresh', color: Colors.freshGreen },
];

export default function PantryScreen() {
  const { items, dispatch } = useMockPantry();
  const [confirmation, setConfirmation] = useState<{ item: PantryItem; action: 'CONSUMED' | 'WASTED' } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchConfirmation, setBatchConfirmation] = useState<{ items: PantryItem[]; action: 'CONSUMED' | 'WASTED' } | null>(null);
  const [batchNotice, setBatchNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterChip>('All');
  const [category, setCategory] = useState<ItemCategory | 'All'>('All');
  const [sort, setSort] = useState<SortMode>('expiry');
  const { added } = useLocalSearchParams<{ added?: string }>();
  useEffect(() => {
    if (added) { setSearch(''); setFilter('All'); setCategory('All'); }
  }, [added]);

  const filtered = items
    .filter((i) => i.status === 'ACTIVE')
    .filter((i) => !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((i) => category === 'All' || i.category === category)
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

  useEffect(() => { setSelectedIds([]); setBatchNotice(''); }, [search, filter, category]);
  const selectedItems = filtered.filter((item) => selectedIds.includes(item.id));
  const toggleSelection = (id: string) => {
    setBatchNotice('');
    setSelectedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };
  const leaveBatch = () => { setBatchMode(false); setSelectedIds([]); setBatchNotice(''); };
  const requestBatch = (action: 'CONSUMED' | 'WASTED') => {
    if (selectedItems.length) setBatchConfirmation({ items: selectedItems, action });
  };
  const atRiskItems = filtered.filter((item) => item.daysLeft <= 1);
  const totalValue = filtered.reduce((sum, i) => sum + i.price, 0);
  const filtersActive = !!search.trim() || filter !== 'All' || category !== 'All';
  const resetFilters = () => { setSearch(''); setFilter('All'); setCategory('All'); };
  const activeCount = items.filter((item) => item.status === 'ACTIVE').length;
  const hasActiveItems = items.some((item) => item.status === 'ACTIVE');

  const requestStatus = (id: string, action: 'CONSUMED' | 'WASTED') => {
    const item = items.find((entry) => entry.id === id);
    if (item?.status === 'ACTIVE') setConfirmation({ item, action });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PantryConfirmation item={confirmation?.item ?? null} action={confirmation?.action ?? 'CONSUMED'}
        onCancel={() => setConfirmation(null)} onConfirm={() => {
          if (!confirmation) return;
          dispatch({ type: 'status', id: confirmation.item.id, status: confirmation.action });
          setConfirmation(null);
        }} />
      {batchConfirmation && <PantryConfirmation item={null} items={batchConfirmation.items} action={batchConfirmation.action}
        onCancel={() => setBatchConfirmation(null)} onConfirm={() => {
          if (!batchConfirmation) return;
          const ids = batchConfirmation.items.map((item) => item.id);
          if (ids.some((id) => !items.some((item) => item.id === id && item.status === 'ACTIVE'))) {
            setBatchConfirmation(null); setBatchNotice('Selection changed. Review the active items and try again.'); return;
          }
          dispatch({ type: 'batch-status', ids, status: batchConfirmation.action });
          setBatchNotice(`${ids.length} ${ids.length === 1 ? 'item' : 'items'} marked as ${batchConfirmation.action === 'CONSUMED' ? 'Used' : 'Wasted'}.`);
          setSelectedIds([]); setBatchMode(false); setBatchConfirmation(null);
        }} />}
      <ScreenHeader title="FreshTrack" subtitle="Inventory" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color={Colors.outline} accessible={false} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeCount} pantry & fridge items...`}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search pantry items"
          />
          <Pressable style={styles.scanButton} onPress={() => router.push('/(tabs)/scanner')}
            accessibilityRole="button" accessibilityLabel="Scan receipt or barcode to add items">
            <MaterialCommunityIcons name="barcode-scan" size={22} color={Colors.primary} accessible={false} />
          </Pressable>
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
              accessibilityState={{ checked: filter === chip.key }}
              aria-checked={filter === chip.key}
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

        {/* Category pills reuse the supplied inventory carousel styling. Counts refer to active inventory. */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryLabel}>Categories</Text>
          {filtersActive && <Pressable onPress={resetFilters} style={styles.clearFilters}
            accessibilityRole="button" accessibilityLabel="Clear pantry filters">
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}
          contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.chip, category === 'All' && styles.categoryActive]}
            onPress={() => setCategory('All')} accessibilityRole="radio"
            accessibilityLabel={`All categories, ${activeCount} active items`}
            accessibilityState={{ checked: category === 'All' }} aria-checked={category === 'All'}>
            <Text style={[styles.chipText, category === 'All' && styles.chipTextActive]}>All Categories ({activeCount})</Text>
          </Pressable>
          {PANTRY_CATEGORIES.map((entry) => {
            const count = items.filter((item) => item.status === 'ACTIVE' && item.category === entry.name).length;
            return <Pressable key={entry.name} style={[styles.chip, category === entry.name && styles.categoryActive]}
              onPress={() => setCategory(entry.name)} accessibilityRole="radio"
              accessibilityLabel={`${entry.name}, ${count} active items`}
              accessibilityState={{ checked: category === entry.name }} aria-checked={category === entry.name}>
              <Text style={[styles.chipText, category === entry.name && styles.chipTextActive]}>{entry.name} ({count})</Text>
            </Pressable>;
          })}
        </ScrollView>

        {/* Dual-Tier Freshness Engine banner follows the reference search/filter hierarchy. */}
        <View style={styles.freshnessEngineBanner}>
          <View style={styles.bannerIcon}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color={Colors.primary} accessible={false} />
          </View>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerHeading}>
              <Text style={styles.bannerTitle}>Dual-Tier Freshness Engine</Text>
              <Text style={styles.bannerStatus}>Active</Text>
            </View>
            <Text style={styles.bannerSub}><Text style={styles.confirmedLabel}>● Confirmed: </Text>Package date in demo fixture.</Text>
            <Text style={styles.bannerSub}><Text style={styles.estimatedLabel}>● Estimated: </Text>Suggested shelf life for loose produce.</Text>
            <Text style={styles.bannerNote}>Demo sources; no AI or package verification.</Text>
          </View>
        </View>

        {/* Value at stake */}
        <View style={styles.valueRow}>
          <Text style={styles.valueLabel}>📊 Value tracked:</Text>
          <Text style={styles.valueAmount}>${totalValue.toFixed(2)}</Text>
          {atRiskItems.length > 0 && (
            <Text style={styles.atRisk}>
              · <Text style={{ color: Colors.criticalRose }}>${
                atRiskItems
                  .reduce((s, i) => s + i.price, 0)
                  .toFixed(2)
              } at risk</Text>
            </Text>
          )}
        </View>

        {/* Reference Batch Select pill; selecting is explicit and never resolves items directly. */}
        <View style={styles.batchControls}>
          <Pressable style={styles.chip} accessibilityRole="button" accessibilityLabel="Add Item Manually"
            onPress={() => router.push('/pantry/add')}>
            <Text style={styles.chipText}>＋ Add Item Manually</Text>
          </Pressable>
          <Pressable style={[styles.chip, batchMode && styles.categoryActive]}
            onPress={() => batchMode ? leaveBatch() : setBatchMode(true)} disabled={!hasActiveItems}
            accessibilityRole="button" accessibilityLabel={batchMode ? 'Cancel batch selection' : 'Batch Select'}
            accessibilityState={{ expanded: batchMode }} aria-expanded={batchMode}>
            <Text style={[styles.chipText, batchMode && styles.chipTextActive]}>{batchMode ? 'Cancel Selection' : '☑ Batch Select'} ({selectedItems.length})</Text>
          </Pressable>
          {batchMode && <Pressable style={styles.chip} disabled={!filtered.length}
            onPress={() => setSelectedIds(selectedItems.length === filtered.length ? [] : filtered.map((item) => item.id))}
            accessibilityRole="button" accessibilityLabel={selectedItems.length === filtered.length && filtered.length > 0 ? 'Deselect visible items' : 'Select visible items'}>
            <Text style={styles.chipText}>{selectedItems.length === filtered.length && filtered.length > 0 ? 'Deselect Visible' : 'Select Visible'}</Text>
          </Pressable>}
        </View>
        {batchMode && <View style={styles.batchPanel}>
          <Text style={styles.swipeHint}>{selectedItems.length} selected · ${selectedItems.reduce((total, item) => total + item.price, 0).toFixed(2)}. Changing filters clears selection.</Text>
          <PrimaryButton label="Mark Selected Used" disabled={!selectedItems.length} onPress={() => requestBatch('CONSUMED')} />
          <PrimaryButton label="Mark Selected Wasted" variant="ghost" disabled={!selectedItems.length} onPress={() => requestBatch('WASTED')} />
        </View>}
        {!!batchNotice && <Text style={styles.swipeHint} accessibilityLiveRegion="polite">{batchNotice}</Text>}
        {/* Items list */}
        {!batchMode && !!filtered.length && <Text style={styles.swipeHint}>Swipe right for Used · left for Wasted</Text>}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥦</Text>
            <Text style={styles.emptyTitle}>
              {!hasActiveItems ? 'Your pantry is empty' : search.trim() ? `No items matching "${search.trim()}" with these filters` : category !== 'All' ? `No ${category.toLowerCase()} items match these filters` : 'No items match this freshness filter'}
            </Text>
            <Text style={styles.emptySub}>
              {hasActiveItems ? 'Clear the filters or try a different search or category.' : 'Scan a receipt or add an item manually.'}
            </Text>
            {filtersActive && <PrimaryButton label="Show All Items" variant="ghost" onPress={resetFilters} />}
            <PrimaryButton label={hasActiveItems ? 'Add Item Manually' : 'Add Your First Item'} onPress={() => router.push('/pantry/add')} />
          </View>
        ) : (
          filtered.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.id } })}
              onSelect={batchMode ? () => toggleSelection(item.id) : undefined}
              selected={batchMode && selectedIds.includes(item.id)}
              onConsume={(id) => requestStatus(id, 'CONSUMED')}
              onWaste={(id) => requestStatus(id, 'WASTED')}
            />
          ))
        )}

        {/* Add item FAB hint */}
        <Pressable
          style={styles.addHint}
          onPress={() => router.push('/(tabs)/scanner')}
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
  batchControls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  batchPanel: { padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  categoryLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.labelMd, color: Colors.onSurfaceVariant },
  clearFilters: { minHeight: 44, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  clearFiltersText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.labelMd, color: Colors.primary },
  categoryActive: { backgroundColor: Colors.primary },
  swipeHint: { fontFamily: 'PlusJakartaSans_400Regular', color: Colors.onSurfaceVariant,
    fontSize: FontSize.bodySm, marginBottom: Spacing.sm },
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenGutter, paddingTop: Spacing.base },

  freshnessEngineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  bannerIcon: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs2 },
  bannerLeft: { flex: 1, minWidth: 0 },
  bannerHeading: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: Spacing.sm },
  bannerStatus: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: FontSize.labelSm, color: Colors.primary, lineHeight: 24 },
  confirmedLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.primary },
  estimatedLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.secondary },
  bannerNote: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.labelSm, lineHeight: 16,
    color: Colors.onSurfaceVariant, marginTop: Spacing.xs },
  bannerTitle: {
    flex: 1,
    minWidth: 120,
    fontSize: FontSize.headlineSm,
    lineHeight: 24,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bannerSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: FontSize.bodySm,
    lineHeight: 18, color: Colors.onSurfaceVariant, marginTop: Spacing.xs2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.full,
    paddingLeft: Spacing.base,
    paddingRight: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    minHeight: 52,
  },
  scanButton: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.inversePrimary,
    alignItems: 'center', justifyContent: 'center' },
  searchInput: {
    flex: 1,
    minWidth: 0,
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
    minHeight: 44,
    justifyContent: 'center',
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
  },
  chipTextActive: {
    color: Colors.onPrimary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  valueRow: {
    flexWrap: 'wrap',
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
