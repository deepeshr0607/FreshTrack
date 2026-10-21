import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
/**
 * Pantry / Kitchen Inventory screen
 * Design reference: design-reference/kitchen_inventory_swipe_actions/screen.png
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
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
import PantryOverview, { PantryIcon } from '@/features/pantry/PantryOverview';
import PantryItemCard from '@/components/PantryItemCard';
import PrimaryButton from '@/components/PrimaryButton';
import NotificationQueuePanel from '@/components/NotificationQueuePanel';
import OverdueReviewCheck from '@/components/OverdueReviewCheck';
import ReconciliationBanner from '@/components/ReconciliationBanner';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import type { ItemCategory, PantryItem } from '@/lib/mock';
import { PANTRY_CATEGORIES } from '@/lib/pantry';
import { useRealPantry } from '@/context/RealPantryContext';
import { pantryFilterKey, pantryCardItem, pantryRetryKey, rupeeValue } from '@/lib/pantryApi';
import type { PantryItemDto, PantryListFilters } from '@/types/api';
import useAuthRequest from '@/features/auth/useAuthRequest';

type FilterChip = 'All' | 'Critical' | 'Caution' | 'Fresh';
type SortMode = 'expiry' | 'name' | 'category';

const FILTER_CHIPS: { key: FilterChip; label: string; color: string }[] = [
  { key: 'All', label: 'All Items', color: Colors.primary },
  { key: 'Critical', label: 'Use first', color: Colors.criticalRose },
  { key: 'Caution', label: 'Use soon', color: Colors.cautionAmber },
  { key: 'Fresh', label: 'Fresh', color: Colors.freshGreen },
];

export default function PantryScreen() {
  const demo = useMockPantry();
  const real = useRealPantry();
  const { enabled: realEnabled, reload: reloadPantry, setFilters: setRealFilters } = real;
  const { dispatch } = demo;
  const items: PantryItem[] = real.enabled ? real.items.map(pantryCardItem) : demo.items;
  useEffect(() => { if (realEnabled) void reloadPantry(); }, [realEnabled, reloadPantry]);
  const [confirmation, setConfirmation] = useState<{ item: PantryItem; action: 'CONSUMED' | 'WASTED'; persisted?: PantryItemDto; key?: string } | null>(null);
  const [outcomeError, setOutcomeError] = useState('');
  const outcomeRequest = useAuthRequest(setOutcomeError);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchConfirmation, setBatchConfirmation] = useState<{ items: PantryItem[]; action: 'CONSUMED' | 'WASTED'; persisted?: PantryItemDto[]; key?: string } | null>(null);
  const [batchError, setBatchError] = useState(''); const batchRequest = useAuthRequest(setBatchError);
  const [undoConfirmation, setUndoConfirmation] = useState<{ items: PantryItemDto[]; key: string } | null>(null);
  const [undoError, setUndoError] = useState(''); const undoRequest = useAuthRequest(setUndoError);
  const [batchNotice, setBatchNotice] = useState('');
  const [search, setSearch] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showDateHelp, setShowDateHelp] = useState(false);
  const [filter, setFilter] = useState<FilterChip>('All');
  const [category, setCategory] = useState<ItemCategory | 'All'>('All');
  const [sort, setSort] = useState<SortMode>('expiry');
  const { added } = useLocalSearchParams<{ added?: string }>();
  useEffect(() => {
    if (added) { setSearch(''); setFilter('All'); setCategory('All'); }
  }, [added]);

  const criteria = useMemo<PantryListFilters>(() => ({ q: search.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase(),
    category: category === 'All' ? undefined : category.toUpperCase() as PantryItemDto['category'],
    freshness: filter === 'All' ? undefined : filter.toLowerCase() as PantryListFilters['freshness'], sort }), [search, category, filter, sort]);
  const criteriaKey = pantryFilterKey(criteria);
  const pendingCriteria = real.enabled && criteriaKey !== pantryFilterKey(real.filters);
  useEffect(() => {
    if (!realEnabled) return;
    const timer = setTimeout(() => setRealFilters(criteria), 250);
    return () => clearTimeout(timer);
  }, [criteria, realEnabled, setRealFilters]);
  const listBusy = real.enabled && (pendingCriteria || real.loading);
  const filtered = real.enabled ? (pendingCriteria ? [] : items) : items
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

  useEffect(() => { setSelectedIds([]); setBatchNotice(''); }, [search, filter, category, sort]);
  const selectedItems = filtered.filter((item) => selectedIds.includes(item.id));
  const toggleSelection = (id: string) => {
    if (real.enabled && !selectedIds.includes(id) && selectedIds.length >= 20) { setBatchNotice('Select up to 20 items per batch.'); return; }
    setBatchNotice('');
    setSelectedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };
  const leaveBatch = () => { setBatchMode(false); setSelectedIds([]); setBatchNotice(''); };
  const requestBatch = (action: 'CONSUMED' | 'WASTED') => {
    if (!selectedItems.length) return;
    setBatchError('');
    if (real.enabled) {
      if (selectedItems.length > 20) { setBatchNotice('Select up to 20 items per batch.'); return; }
      const persisted = selectedItems.map(item => real.items.find(entry => entry.id === item.id)!);
      setBatchConfirmation({ items: selectedItems, action, persisted, key: pantryRetryKey() });
    } else setBatchConfirmation({ items: selectedItems, action });
  };
  const totalValue = filtered.reduce((sum, i) => sum + i.price, 0);
  const filtersActive = !!search.trim() || filter !== 'All' || category !== 'All';
  const resetFilters = () => { setSearch(''); setFilter('All'); setCategory('All'); };
  const activeCount = real.enabled ? real.inventory.active : items.filter((item) => item.status === 'ACTIVE').length;
  const hasActiveItems = activeCount > 0;

  const requestStatus = (id: string, action: 'CONSUMED' | 'WASTED') => {
    if (real.enabled) {
      const item = real.items.find(entry => entry.id === id);
      if (item?.status === 'ACTIVE') { setOutcomeError(''); setConfirmation({ item: pantryCardItem(item), action, persisted: item, key: pantryRetryKey() }); }
      return;
    }
    const item = items.find((entry) => entry.id === id);
    if (item?.status === 'ACTIVE') setConfirmation({ item, action });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PantryConfirmation item={confirmation?.item ?? null} action={confirmation?.action ?? 'CONSUMED'}
        loading={outcomeRequest.loading} error={outcomeError}
        onCancel={() => { setConfirmation(null); setOutcomeError(''); }} onConfirm={() => {
          if (!confirmation) return;
          if (real.enabled && confirmation.persisted && confirmation.key) {
            const pending = confirmation;
            setOutcomeError('');
            void outcomeRequest.run(async isMounted => {
              await real.outcome(pending.persisted!.id, pending.action === 'CONSUMED' ? 'consume' : 'waste',
                { confirmed: true, expectedUpdatedAt: pending.persisted!.updatedAt }, pending.key!);
              if (isMounted()) { setConfirmation(null); setBatchNotice(`Item marked as ${pending.action === 'CONSUMED' ? 'Used' : 'Wasted'} and saved to your household.`); }
            });
            return;
          }
          dispatch({ type: 'status', id: confirmation.item.id, status: confirmation.action });
          setConfirmation(null);
        }} />
      {batchConfirmation && <PantryConfirmation item={null} items={batchConfirmation.items} action={batchConfirmation.action}
        loading={batchRequest.loading} error={batchError} currencySymbol={real.enabled ? '₹' : '$'}
        unknownIds={batchConfirmation.persisted?.filter(item => item.totalCostMinor === null).map(item => item.id)}
        onCancel={() => { setBatchConfirmation(null); setBatchError(''); }} onConfirm={() => {
          if (!batchConfirmation) return;
          if (real.enabled && batchConfirmation.persisted && batchConfirmation.key) {
            const pending = batchConfirmation; setBatchError('');
            void batchRequest.run(async isMounted => {
              await real.batchOutcome({ confirmed: true, action: pending.action === 'CONSUMED' ? 'consume' : 'waste',
                items: pending.persisted!.map(item => ({ id: item.id, expectedUpdatedAt: item.updatedAt })) }, pending.key!);
              if (isMounted()) {
                setSelectedIds([]); setBatchMode(false); setBatchConfirmation(null);
                setBatchNotice(`${pending.items.length} items updated together and saved to your household.`);
              }
            });
            return;
          }
          const ids = batchConfirmation.items.map((item) => item.id);
          if (ids.some((id) => !items.some((item) => item.id === id && item.status === 'ACTIVE'))) {
            setBatchConfirmation(null); setBatchNotice('Selection changed. Review the active items and try again.'); return;
          }
          dispatch({ type: 'batch-status', ids, status: batchConfirmation.action });
          setBatchNotice(`${ids.length} ${ids.length === 1 ? 'item' : 'items'} marked as ${batchConfirmation.action === 'CONSUMED' ? 'Used' : 'Wasted'}.`);
          setSelectedIds([]); setBatchMode(false); setBatchConfirmation(null);
        }} />}
      {undoConfirmation && <PantryConfirmation item={null} items={undoConfirmation.items.map(pantryCardItem)} action="CONSUMED" undo
        currencySymbol="₹" unknownIds={undoConfirmation.items.filter(item => item.totalCostMinor === null).map(item => item.id)} loading={undoRequest.loading} error={undoError}
        onCancel={() => { setUndoConfirmation(null); setUndoError(''); }} onConfirm={() => {
          const pending = undoConfirmation; setUndoError('');
          void undoRequest.run(async isMounted => {
            await real.batchUndo({ confirmed: true, items: pending.items.map(item => ({ id: item.id, expectedUpdatedAt: item.updatedAt })) }, pending.key);
            if (isMounted()) { setUndoConfirmation(null); setBatchNotice('Groceries restored to active Pantry.'); }
          });
        }} />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={real.enabled ? <RefreshControl refreshing={real.loading} onRefresh={() => { if (real.cachePreview) real.endCachePreview(); else void real.reload(); }} tintColor={Colors.primary} colors={[Colors.primary]} /> : undefined}
      >
        <PantryOverview count={activeCount} value={`${real.enabled ? '₹' : '$'}${totalValue.toFixed(2)}`}
          countLabel={real.enabled && real.readOnly ? 'CACHED ITEMS' : 'ACTIVE ITEMS'} valueLabel="LOADED KNOWN VALUE"
          loading={real.enabled && (pendingCriteria || (real.loading && !items.length))} readOnly={real.enabled && real.readOnly}
          onAdd={() => router.push('/pantry/add')} onScan={() => router.push('/(tabs)/scanner')} onSettings={() => router.push('/settings')} />
        {/* Search */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color={Colors.outline} accessible={false} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find something in your pantry…"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={search}
            maxLength={120}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search pantry items"
          />
          <Pressable style={styles.scanButton} onPress={() => setShowCategories(value => !value)}
            accessibilityRole="button" accessibilityLabel="Show category filters" accessibilityState={{ expanded: showCategories }}>
            <PantryIcon name="tune-variant" />
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
              style={[styles.chip, filter === chip.key && { backgroundColor: Colors.primary }]}
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


        </ScrollView>

        {/* Category pills reuse the supplied inventory carousel styling. Counts refer to active inventory. */}
        <View style={styles.categoryHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle category filters" accessibilityState={{ expanded: showCategories }} onPress={() => setShowCategories(value => !value)} style={styles.filterToggle}>
            <PantryIcon name="shape-outline" size={17} /><Text style={styles.categoryLabel}>{category === 'All' ? 'All categories' : category}</Text><PantryIcon name={showCategories ? 'chevron-up' : 'chevron-down'} size={17} />
          </Pressable>
          {filtersActive && <Pressable onPress={resetFilters} style={styles.clearFilters}
            accessibilityRole="button" accessibilityLabel="Clear pantry filters">
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </Pressable>}
        </View>
        {showCategories && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}
          contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.chip, category === 'All' && styles.categoryActive]}
            onPress={() => setCategory('All')} accessibilityRole="radio"
            accessibilityLabel={`All categories, ${activeCount} active items`}
            accessibilityState={{ checked: category === 'All' }} aria-checked={category === 'All'}>
            <Text style={[styles.chipText, category === 'All' && styles.chipTextActive]}>All Categories ({activeCount})</Text>
          </Pressable>
          {PANTRY_CATEGORIES.map((entry) => {
            const count = real.enabled ? real.inventory.categories[entry.name.toUpperCase() as PantryItemDto['category']] ?? 0 : items.filter((item) => item.status === 'ACTIVE' && item.category === entry.name).length;
            return <Pressable key={entry.name} style={[styles.chip, category === entry.name && styles.categoryActive]}
              onPress={() => setCategory(entry.name)} accessibilityRole="radio"
              accessibilityLabel={`${entry.name}, ${count} active items`}
              accessibilityState={{ checked: category === entry.name }} aria-checked={category === entry.name}>
              <Text style={[styles.chipText, category === entry.name && styles.chipTextActive]}>{entry.name} ({count})</Text>
            </Pressable>;
          })}
        </ScrollView>}

        {/* Reference Batch Select pill; selecting is explicit and never resolves items directly. */}
        <ReconciliationBanner compact />
        <View style={styles.listHeader}><Text style={styles.listTitle}>{filtersActive ? 'Matching groceries' : 'Your groceries'}</Text>
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
        </View>
        <View style={styles.batchControls}>
          <Pressable style={[styles.chip, batchMode && styles.categoryActive]}
            onPress={() => batchMode ? leaveBatch() : setBatchMode(true)} disabled={!hasActiveItems || listBusy || (real.enabled && real.readOnly)}
            accessibilityRole="button" accessibilityLabel={batchMode ? 'Cancel batch selection' : 'Batch Select'}
            accessibilityState={{ expanded: batchMode }} aria-expanded={batchMode}>
            <Text style={[styles.chipText, batchMode && styles.chipTextActive]}>{batchMode ? `Cancel · ${selectedItems.length} selected` : 'Select items'}</Text>
          </Pressable>
          {batchMode && <Pressable style={styles.chip} disabled={!filtered.length || listBusy || (real.enabled && real.readOnly)}
            onPress={() => {
              if (real.enabled && filtered.length > 20 && selectedItems.length !== filtered.length) { setBatchNotice('More than 20 items are visible. Choose up to 20 individually.'); return; }
              setSelectedIds(selectedItems.length === filtered.length ? [] : filtered.map(item => item.id));
            }}
            accessibilityRole="button" accessibilityLabel={selectedItems.length === filtered.length && filtered.length > 0 ? 'Deselect visible items' : 'Select visible items'}>
            <Text style={styles.chipText}>{selectedItems.length === filtered.length && filtered.length > 0 ? 'Deselect Visible' : 'Select Visible'}</Text>
          </Pressable>}
        </View>
        {batchMode && <View style={styles.batchPanel}>
          <Text style={styles.swipeHint}>{selectedItems.length} selected · {real.enabled ? '₹' : '$'}{selectedItems.reduce((total, item) => total + item.price, 0).toFixed(2)} known value. Changing filters clears selection.{real.enabled ? ' Up to 20 per batch.' : ''}</Text>
          <PrimaryButton label="Mark Selected Used" disabled={!selectedItems.length || listBusy || (real.enabled && real.readOnly)} onPress={() => requestBatch('CONSUMED')} />
          <PrimaryButton label="Mark Selected Wasted" variant="ghost" disabled={!selectedItems.length || listBusy || (real.enabled && real.readOnly)} onPress={() => requestBatch('WASTED')} />
        </View>}
        {!!batchNotice && <Text style={styles.swipeHint} accessibilityLiveRegion="polite">{batchNotice}</Text>}
        {real.enabled && <>
          {!!real.lastOutcome.length && <View style={styles.batchPanel}>
            <Text style={styles.swipeHint}>{real.lastOutcome.length} groceries marked Used/Wasted in your last action.</Text>
            <PrimaryButton label="Undo Last Outcome" variant="ghost" disabled={real.readOnly} onPress={() => { setUndoError(''); setUndoConfirmation({ items: real.lastOutcome, key: pantryRetryKey() }); }} />
            <PrimaryButton label="Dismiss Undo" variant="ghost" onPress={real.dismissUndo} />
          </View>}
          {real.readOnly && <Text style={[styles.swipeHint, { color: Colors.cautionAmber }]} accessibilityLiveRegion="polite">
            Cached Pantry · read-only · {real.cachedAt ? `Last updated ${new Date(real.cachedAt).toLocaleString()}. This subset may be incomplete.` : 'Nothing cached in this session.'} Refresh online to make changes.
          </Text>}
          {DIAGNOSTICS_ENABLED && !!real.diskStatus && <Text style={styles.swipeHint} accessibilityLiveRegion="polite">{real.diskStatus}</Text>}
          {real.cachePreview && <Text style={styles.swipeHint}>Development cached-view test: Pantry requests are paused; authentication remains active.</Text>}
          <NotificationQueuePanel />
          <OverdueReviewCheck />
          {(real.readOnly || !!real.error || DIAGNOSTICS_ENABLED) && <PrimaryButton label={real.cachePreview ? 'End Test & Refresh' : 'Refresh Pantry'} variant="ghost" loading={real.loading}
            onPress={() => real.cachePreview ? real.endCachePreview() : void real.reload()} />}
          {DIAGNOSTICS_ENABLED && !real.readOnly && !!items.length && <PrimaryButton label="Test Cached Pantry View" variant="ghost" disabled={real.loading} onPress={real.previewCache} />}
          {!!real.error && <Text style={[styles.swipeHint, { color: Colors.error }]} accessibilityRole="alert">{real.error} {items.length && !real.readOnly ? 'Showing previously loaded items.' : ''}</Text>}

        </>}
        {real.enabled && !pendingCriteria && <Text style={styles.resultCount}>{filtered.length} of {real.total} matching groceries loaded{real.readOnly ? ' · saved subset' : ''} · Known values exclude unpriced items</Text>}
        {/* Items list */}
        {!batchMode && !!filtered.length && !(real.enabled && real.readOnly) && <Text style={styles.swipeHint}>Swipe right for Used · left for Wasted</Text>}
        {real.enabled && (pendingCriteria || (!items.length && (real.loading || real.error) && (!real.readOnly || !real.cachedAt))) ? <Text style={styles.swipeHint}>{listBusy ? 'Loading matching pantry items…' : 'Your pantry could not be loaded. Pull down to refresh or tap Refresh Pantry to retry.'}</Text> : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥦</Text>
            <Text style={styles.emptyTitle}>
              {real.enabled && real.readOnly ? 'No cached items match these filters' : !hasActiveItems ? 'Your pantry is empty' : search.trim() ? `No items matching "${search.trim()}" with these filters` : category !== 'All' ? `No ${category.toLowerCase()} items match these filters` : 'No items match this freshness filter'}
            </Text>
            <Text style={styles.emptySub}>
              {real.enabled && real.readOnly ? 'Only previously loaded entries are available. Refresh online for the full Pantry.' : hasActiveItems ? 'Clear the filters or try a different search or category.' : real.enabled ? 'Add your first grocery manually. It will be saved to your household.' : 'Scan a receipt or add an item manually.'}
            </Text>
            {filtersActive && <PrimaryButton label="Show All Items" variant="ghost" onPress={resetFilters} />}
            <PrimaryButton disabled={real.enabled && real.readOnly} label={hasActiveItems ? 'Add Item Manually' : 'Add Your First Item'} onPress={() => router.push('/pantry/add')} />
          </View>
        ) : (
          filtered.map((item) => (
            <PantryItemCard
              refreshed
              hideActions={listBusy || (real.enabled && (real.readOnly || !!real.error || real.pendingNotificationIds.includes(item.id)))}
              packageDateLabel={real.enabled ? 'Package date' : undefined}
              key={item.id}
              item={item}
              onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.id } })}
              onSelect={batchMode ? () => { if (!listBusy && !real.readOnly) toggleSelection(item.id); } : undefined}
              selected={batchMode && selectedIds.includes(item.id)}
              valueLabel={real.enabled ? rupeeValue(real.items.find(entry => entry.id === item.id)!.totalCostMinor) : undefined}
              onConsume={(id) => requestStatus(id, 'CONSUMED')}
              onWaste={(id) => requestStatus(id, 'WASTED')}
            />
          ))
        )}
        {real.enabled && !pendingCriteria && real.hasMore && <PrimaryButton label="Load More Items" variant="ghost" loading={real.loading} onPress={() => void real.loadMore()} />}

        {/* Date-source help replaces the former always-expanded engine explanation. */}
        <View style={styles.dateHelp}>
          <Pressable onPress={() => setShowDateHelp(value => !value)} accessibilityRole="button" accessibilityLabel="About expiry dates" accessibilityState={{ expanded: showDateHelp }} style={styles.helpToggle}>
            <PantryIcon name="shield-check-outline" size={18} /><Text style={styles.helpText}>Package date · User set · Estimated</Text><PantryIcon name={showDateHelp ? 'chevron-up' : 'chevron-down'} size={18} />
          </Pressable>
          {showDateHelp && <Text style={styles.helpBody}>Package dates take priority. Estimated dates are editable shelf-life assumptions, not freshness guarantees. Your household uses Asia/Kolkata dates.</Text>}
        </View>

        {/* Receipt entry remains available after longer lists. */}
        <Pressable
          style={styles.addHint}
          onPress={() => router.push('/(tabs)/scanner')}
          accessibilityRole="button"
          accessibilityLabel="Scan a receipt to add groceries"
        >
          <Text style={styles.addHintText}>
            📷 Scan a receipt to add groceries →
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
  content: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12 },

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
  scanButton: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.surfaceContainerLow,
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
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
  },
  sortChip: {
    borderWidth: 0,
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
    borderColor: Colors.surfaceContainer,
  },
  addHintText: {
    fontSize: FontSize.bodyMd,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  filterToggle: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 },
  dateHelp: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 14, marginBottom: 14 },
  helpToggle: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, minHeight: 44 },
  helpText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, lineHeight: 17, color: Colors.onSurfaceVariant },
  helpBody: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 19, paddingHorizontal: 14, paddingBottom: 14, color: Colors.onSurfaceVariant },
  listHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  listTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 19, color: Colors.onSurface },
  resultCount: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 10, lineHeight: 17, color: Colors.onSurfaceVariant, marginBottom: 12 },

});
