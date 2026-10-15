/**
 * RecipeCard.tsx — Recipe card for AI Chef screen.
 * Design reference: design-reference/recipe/screen.png
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { recipeImages } from '@/lib/designAssets';
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
  saved?: boolean;
  onSave?: () => void;
}

export default function RecipeCard({ recipe, featured = false, onPress, onCook, saved, onSave }: Props) {
  if (featured) {
    return (
      <View style={styles.featuredCard}>
        {/* Hero image area */}
        <View style={styles.heroImage}>
          <Pressable onPress={onPress} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={recipe.title}>
            <Image source={recipeImages[recipe.imageKey]} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
          </Pressable>
          {/* Overlay badges */}
          <View style={styles.heroBadges}>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>🔥 {recipe.matchPercent}% Match</Text>
            </View>
            <View style={styles.rescueBadge}>
              <Text style={styles.rescueText}>⚡ Rescues {recipe.rescuesItems.length} items</Text>
            </View>
          </View>
          <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
            style={styles.saveButton}><Text style={{ fontSize: 24, color: Colors.primary }}>{saved ? '♥' : '♡'}</Text></Pressable>
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
          <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${recipe.title} details`}>
          <Text style={styles.featuredTitle}>{recipe.title}</Text>
          </Pressable>
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {recipe.description}
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
      </View>
    );
  }

  // Compact list card
  return (
    <View style={styles.compactCard}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
    >
      <View style={styles.compactThumb}>
        <Image source={recipeImages[recipe.imageKey]} style={{ width: '100%', height: '100%', borderRadius: Radius.md }} />
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
    </Pressable>
      <Pressable
        onPress={onCook}
        style={styles.smallCookBtn}
        accessibilityRole="button"
        accessibilityLabel={`Cook ${recipe.title}`}
      >
        <Text style={styles.smallCookText}>Cook</Text>
      </Pressable>
    </View>
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
  saveButton: { position: 'absolute', top: 12, right: 12, width: 44, height: 44,
    borderRadius: 22, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  heroBadges: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  matchBadge: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  matchText: { color: Colors.onSurface, fontSize: FontSize.labelSm, fontWeight: FontWeight.bold },
  rescueBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.lg,
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
    borderRadius: Radius.lg,
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

// Shared visual styles preserve the supplied card design for real provider data.
export { styles as recipeCardStyles };
