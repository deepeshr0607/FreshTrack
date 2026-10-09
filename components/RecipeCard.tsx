/**
 * RecipeCard.tsx — Recipe card for AI Chef screen.
 * Design reference: design-reference/recipe/screen.png
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Colors,
  Elevation,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../constants/Theme';
import type { Recipe } from '../lib/mock';

interface Props {
  recipe: Recipe;
  featured?: boolean;
  onPress?: () => void;
  onCook?: () => void;
}

export default function RecipeCard({ recipe, featured = false, onPress, onCook }: Props) {
  if (featured) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={recipe.title}
      >
        {/* Hero image area */}
        <View style={styles.heroImage}>
          <Text style={styles.heroEmoji}>{recipe.imageEmoji}</Text>
          {/* Overlay badges */}
          <View style={styles.heroBadges}>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>🔥 {recipe.matchPercent}% Match</Text>
            </View>
            <View style={styles.rescueBadge}>
              <Text style={styles.rescueText}>⚡ Rescues {recipe.rescuesItems.length} items</Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>⏱ {recipe.prepMinutes}m</Text>
            <Text style={styles.heroMetaText}>● {recipe.difficulty}</Text>
            <Text style={styles.heroMetaText}>{recipe.calories} kcal</Text>
            {recipe.tags.includes('Zero-Waste') && (
              <View style={styles.zeroWasteBadge}>
                <Text style={styles.zeroWasteText}>Zero-Waste</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>{recipe.title}</Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {recipe.instructions}
          </Text>

          {/* Pantry items */}
          <View style={styles.pantryRow}>
            {recipe.pantryItems.map((item) => (
              <View key={item} style={styles.pantryPill}>
                <Text style={styles.pantryPillText}>✓ {item}</Text>
              </View>
            ))}
          </View>
          {recipe.missingIngredients.length > 0 && (
            <Text style={styles.needText}>
              Need: {recipe.missingIngredients.length} staple
              {recipe.missingIngredients.length > 1 ? 's' : ''}
            </Text>
          )}

          <Pressable
            onPress={onCook}
            style={({ pressed }) => [styles.cookBtn, pressed && styles.cookBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Cook ${recipe.title}`}
          >
            <Text style={styles.cookBtnText}>🍽 Cook This Tonight</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  // Compact list card
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.compactCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
    >
      <View style={styles.compactThumb}>
        <Text style={styles.compactEmoji}>{recipe.imageEmoji}</Text>
        <View style={styles.compactMatchBadge}>
          <Text style={styles.compactMatchText}>{recipe.matchPercent}%</Text>
        </View>
      </View>
      <View style={styles.compactInfo}>
        {recipe.rescuesItems.length > 0 && (
          <Text style={styles.rescueLabel}>⚡ Rescues {recipe.rescuesItems.join(' & ')}</Text>
        )}
        <Text style={styles.compactTitle} numberOfLines={1}>{recipe.title}</Text>
        <Text style={styles.compactMeta}>
          ⏱ {recipe.prepMinutes}m · {recipe.difficulty}
        </Text>
        {recipe.missingIngredients.length === 0 ? (
          <Text style={styles.allInStock}>All ingredients in stock</Text>
        ) : (
          <Text style={styles.needSmall}>Need: {recipe.missingIngredients.join(', ')}</Text>
        )}
      </View>
      <Pressable
        onPress={onCook}
        style={styles.smallCookBtn}
        accessibilityRole="button"
        accessibilityLabel="Cook"
      >
        <Text style={styles.smallCookText}>Cook</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Featured (large) card
  featuredCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    ...Elevation.sheet,
  },
  pressed: { opacity: 0.92 },
  heroImage: {
    height: 200,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroEmoji: { fontSize: 80 },
  heroBadges: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  matchBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  matchText: { color: '#fff', fontSize: FontSize.labelSm, fontWeight: FontWeight.bold },
  rescueBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  rescueText: { color: '#fff', fontSize: FontSize.labelSm, fontWeight: FontWeight.bold },
  heroMeta: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  heroMetaText: {
    color: '#fff',
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.semibold,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  zeroWasteBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  zeroWasteText: { color: '#fff', fontSize: FontSize.labelSm, fontWeight: FontWeight.bold },
  featuredContent: { padding: Spacing.base, gap: Spacing.sm },
  featuredTitle: {
    fontSize: FontSize.headlineMd,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.onSurface,
  },
  featuredDesc: {
    fontSize: FontSize.bodyMd,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  pantryRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  pantryPill: {
    backgroundColor: Colors.freshGreenBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  pantryPillText: {
    color: Colors.freshGreen,
    fontSize: FontSize.labelSm,
    fontWeight: FontWeight.semibold,
  },
  needText: {
    fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
  },
  cookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  cookBtnPressed: { opacity: 0.85 },
  cookBtnText: {
    color: Colors.onPrimary,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.labelLg,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Compact (list) card
  compactCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Elevation.card,
  },
  compactThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactEmoji: { fontSize: 32 },
  compactMatchBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  compactMatchText: {
    color: Colors.onPrimary,
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  compactInfo: { flex: 1 },
  rescueLabel: {
    fontSize: FontSize.labelSm,
    color: Colors.cautionAmber,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.semibold,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  compactMeta: {
    fontSize: FontSize.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  allInStock: {
    fontSize: FontSize.labelSm,
    color: Colors.freshGreen,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  needSmall: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  smallCookBtn: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  smallCookText: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.labelMd,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
