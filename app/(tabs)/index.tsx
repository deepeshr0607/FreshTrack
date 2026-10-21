/**
 * Home / Dashboard screen
 * Design reference: design-reference/freshtrack_dynamic_hub/screen.png
 */
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import ExpiryBadge from '@/components/ExpiryBadge';
import RecentPantryItemCard from '@/components/RecentPantryItemCard';
import PantryConfirmation from '@/components/PantryConfirmation';
import type { PantryItem } from '@/lib/mock';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import {
  MOCK_RECIPES,
  MOCK_ANALYTICS_SUMMARY,
} from '@/lib/mock';

import { useMockPantry } from '@/context/MockPantryContext';

type Mode = 'at-home' | 'shopping';

export default function HomeScreen() {
  const { items, dispatch } = useMockPantry();
  const [confirmation, setConfirmation] = useState<{ item: PantryItem; action: 'CONSUMED' | 'WASTED' } | null>(null);
  const requestStatus = (id: string, action: 'CONSUMED' | 'WASTED') => {
    const item = items.find((candidate) => candidate.id === id && candidate.status === 'ACTIVE');
    if (item) setConfirmation({ item, action });
  };
  const activeItems = items.filter((item) => item.status === 'ACTIVE');
  const [mode, setMode] = useState<Mode>('at-home');
  const expiringItems = activeItems.filter((i) => i.daysLeft <= 7 && i.status === 'ACTIVE').slice(0, 5);
  const recentItems = [...activeItems].slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="FreshTrack" subtitle="Dashboard" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode switcher */}
        <View style={styles.modeSwitcher}>
          <Pressable
            style={[styles.modeBtn, mode === 'at-home' && styles.modeBtnActive]}
            onPress={() => setMode('at-home')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'at-home' }}
          >
            <Text style={[styles.modeBtnText, mode === 'at-home' && styles.modeBtnTextActive]}>
              🏠 At Home
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'shopping' && styles.modeBtnActive]}
            onPress={() => setMode('shopping')}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === 'shopping' }}
          >
            <Text style={[styles.modeBtnText, mode === 'shopping' && styles.modeBtnTextActive]}>
              🛒 Shopping Mode
            </Text>
          </Pressable>
        </View>

        {/* Kitchen Digest alert */}
        <View style={styles.digestCard}>
          <View style={styles.digestIcon}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </View>
          <View style={styles.digestBody}>
            <View style={styles.digestHeader}>
              <Text style={styles.digestKitchenLabel}>KITCHEN DIGEST</Text>
              <View style={styles.digestDot} />
              <Text style={styles.digestPriority}>Today's Priority</Text>
            </View>
            <Text style={styles.digestTitle}>
              3 items need attention today (
              <Text style={styles.digestValue}>$8.40 value</Text> to rescue)
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/recipes')} accessibilityRole="link">
              <Text style={styles.digestCta}>Tap to view recovery meal plan →</Text>
            </Pressable>
          </View>
        </View>

        {/* Metric cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { flex: 1 }]}>
            <Text style={styles.metricLabel}>RESCUE VALUE</Text>
            <View style={styles.metricIconRow}>
              <Text style={styles.metricValue}>
                ${MOCK_ANALYTICS_SUMMARY.moneySaved.toFixed(2)}
              </Text>
              <View style={styles.metricIconCircle}>
                <Text style={{ fontSize: 16 }}>💰</Text>
              </View>
            </View>
            <Text style={styles.metricSub}>4 items rescued this wk</Text>
          </View>
          <View style={[styles.metricCard, { flex: 1 }]}>
            <Text style={styles.metricLabel}>INVENTORY</Text>
            <View style={styles.metricIconRow}>
              <Text style={styles.metricValueLarge}>{activeItems.length} Items</Text>
              <View style={[styles.metricIconCircle, { backgroundColor: Colors.surfaceContainerHigh }]}>
                <Text style={{ fontSize: 16 }}>📦</Text>
              </View>
            </View>
            <Text style={styles.metricSub}>
              {activeItems.filter(i => i.category === 'Produce').length} Pantry ·{' '}
              {activeItems.filter(i => i.category === 'Dairy').length} Fridge
            </Text>
          </View>
        </View>

        {/* Expiring this week */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.redDot} />
            <Text style={styles.sectionTitle}>Expiring This Week</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/pantry')} accessibilityRole="link">
            <Text style={styles.seeAll}>See All ({expiringItems.length})</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {expiringItems.map((item) => (
            <View key={item.id} style={styles.expiryCard}>
              <Pressable
                onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <ExpiryBadge daysLeft={item.daysLeft} expirySource={item.expirySource} compact />
                <Text style={styles.expiryPrice}>
                  ${item.price.toFixed(2)} at risk
                </Text>
                <View style={styles.expiryThumb}>
                  <Text style={{ fontSize: 32 }}>{item.imageEmoji}</Text>
                </View>
                <Text style={styles.expiryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.expirySource}>
                  {item.expirySource === 'PACKAGE_DATE' ? '✓ Confirmed' : item.expirySource === 'USER_ENTERED' ? 'User-entered date' : '✦ Estimated (Rule)'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.pairBtn}
                onPress={() => router.push('/(tabs)/recipes')}
                accessibilityRole="button"
                accessibilityLabel="Pair recipe"
              >
                <Text style={styles.pairBtnText}>🍽 {MOCK_RECIPES[0]?.rescuesItems[0]?.split(' ')[0] ?? 'Pair'}</Text>
                <Text style={styles.pairAction}>Pair</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* Actionable Recipes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✦ Actionable Recipes</Text>
          <Text style={styles.sectionSubtitle}>Spoonacular AI</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {MOCK_RECIPES.slice(0, 2).map((recipe) => (
            <View key={recipe.id} style={styles.recipeHeroCard}>
              <Pressable
                onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                accessibilityRole="button"
                accessibilityLabel={recipe.title}
              >
                <View style={styles.recipeHeroImage}>
                  <Text style={{ fontSize: 52 }}>{recipe.imageEmoji}</Text>
                  <View style={styles.recipeHeroBadge}>
                    <Text style={styles.recipeHeroBadgeText}>
                      ⚡ Rescues {recipe.rescuesItems.length} Items
                    </Text>
                  </View>
                  <View style={styles.recipeHeroTime}>
                    <Text style={styles.recipeHeroTimeText}>{recipe.prepMinutes} min</Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.recipeHeroContent}>
                <Pressable onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                  accessibilityRole="button" accessibilityLabel={`${recipe.title} details`}>
                  <Text style={styles.recipeHeroTitle} numberOfLines={1}>{recipe.title}</Text>
                  <Text style={styles.recipeHeroDesc} numberOfLines={2}>{recipe.instructions}</Text>
                </Pressable>
                <Pressable
                  style={styles.cookedBtn}
                  onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
                  accessibilityRole="button"
                  accessibilityLabel="I Cooked This"
                >
                  <Text style={styles.cookedBtnText}>✓ I Cooked This</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Recent Additions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Additions</Text>
          <Text style={styles.seeAll}>↔ Swipe actions</Text>
        </View>

        {recentItems.map((item) => (
          <RecentPantryItemCard key={item.id} item={item} onRequestStatus={requestStatus}
            onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.id } })} />
        ))}
        {recentItems.length === 0 && (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>No active groceries yet.</Text>
            <Pressable onPress={() => router.push('/pantry/add')} accessibilityRole="button"
              accessibilityLabel="Add a pantry item" style={styles.emptyRecentButton}>
              <Text style={styles.seeAll}>Add a pantry item →</Text>
            </Pressable>
          </View>
        )}

        {/* Swipe hint */}
        <View style={styles.swipeHintRow}>
          <Text style={styles.swipeHintText}>
            {'> Swipe right: Mark Used  '}
          </Text>
          <Text style={[styles.swipeHintText, { color: Colors.criticalRose }]}>
            {'• Swipe left: Wasted <'}
          </Text>
        </View>

        {/* Bottom padding for floating nav */}
        <View style={{ height: Spacing.navClearance }} />
      </ScrollView>
      <PantryConfirmation item={confirmation?.item ?? null} action={confirmation?.action ?? 'CONSUMED'}
        onCancel={() => setConfirmation(null)} onConfirm={() => {
          if (confirmation) dispatch({ type: 'status', id: confirmation.item.id, status: confirmation.action });
          setConfirmation(null);
        }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenGutter, paddingTop: Spacing.sm },

  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.base,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  modeBtnActive: { backgroundColor: Colors.surfaceContainerLowest },
  modeBtnText: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  modeBtnTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  digestCard: {
    flexDirection: 'row',
    backgroundColor: Colors.criticalRoseBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(225,29,72,0.15)',
  },
  digestIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.criticalRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digestBody: { flex: 1 },
  digestHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  digestKitchenLabel: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.criticalRose,
    letterSpacing: 0.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  digestDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.criticalRose,
  },
  digestPriority: { fontSize: FontSize.labelSm, color: Colors.criticalRose },
  digestTitle: {
    fontSize: FontSize.bodyMd,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: Spacing.xs,
  },
  digestValue: { color: Colors.criticalRose },
  digestCta: {
    fontSize: FontSize.bodySm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metricCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Elevation.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: Spacing.xs,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.freshGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: FontSize.statCounter,
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  metricValueLarge: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  metricSub: { fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.base,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.criticalRose },
  sectionTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  sectionSubtitle: { fontSize: FontSize.labelMd, color: Colors.smartAzure },
  seeAll: {
    fontSize: FontSize.labelLg,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  horizontalScroll: { marginHorizontal: -Spacing.screenGutter, paddingHorizontal: Spacing.screenGutter, marginBottom: Spacing.sm },

  expiryCard: {
    width: 160,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    ...Elevation.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expiryPrice: {
    fontSize: FontSize.labelSm,
    color: Colors.criticalRose,
    fontWeight: FontWeight.bold,
    marginVertical: Spacing.xs,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  expiryThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  expiryName: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  expirySource: { fontSize: FontSize.labelSm, color: Colors.smartAzure, marginBottom: Spacing.sm },
  pairBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  pairBtnText: { fontSize: FontSize.labelSm, color: Colors.onSurfaceVariant },
  pairAction: {
    fontSize: FontSize.labelSm,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  recipeHeroCard: {
    width: 280,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginRight: Spacing.sm,
    ...Elevation.sheet,
  },
  recipeHeroImage: {
    height: 140,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  recipeHeroBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  recipeHeroBadgeText: {
    color: Colors.onPrimary,
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.bold,
  },
  recipeHeroTime: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  recipeHeroTimeText: { color: '#fff', fontSize: FontSize.labelSm, fontWeight: FontWeight.bold },
  recipeHeroContent: { padding: Spacing.md },
  recipeHeroTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: Spacing.xs,
  },
  recipeHeroDesc: {
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cookedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cookedBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.labelMd,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  emptyRecent: { padding: Spacing.md, backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg },
  emptyRecentText: { fontSize: FontSize.bodyMd, color: Colors.onSurfaceVariant },
  emptyRecentButton: { minHeight: 44, justifyContent: 'center' },
  swipeHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
    flexWrap: 'wrap',
  },
  swipeHintText: {
    fontSize: FontSize.labelSm,
    color: Colors.freshGreen,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
