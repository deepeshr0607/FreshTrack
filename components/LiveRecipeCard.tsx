import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { recipeCardStyles as styles } from './RecipeCard';
import { Colors, Radius } from '@/constants/Theme';
import { ui } from './PrototypeScreen';
import type { ChefSuggestionsData } from '@/types/api';
export function LiveRecipeImage({ uri, height = 240 }: { uri: string | null; height?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <View style={{ height, width: '100%', backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {uri && !failed ? <Image source={{ uri }} accessibilityLabel="Recipe photo" onError={() => setFailed(true)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      : <Text style={ui.text}>Recipe photo unavailable</Text>}
  </View>;
}
export default function LiveRecipeCard({ recipe, featured, saved, onSave, onPress }: {
  recipe: ChefSuggestionsData['recipes'][number]; featured?: boolean; saved: boolean; onSave(): void; onPress(): void;
}) {
  const missing = recipe.match.shoppingItems.length;
  if (!featured) return <View style={[styles.compactCard, { alignItems: 'flex-start' }]}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${recipe.title}, ${recipe.match.pantryNameMatchPercent}% name match`} style={{ flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 }}>
      <View style={styles.compactThumb}><LiveRecipeImage uri={recipe.imageUrl} height={60} /></View>
      <View style={[styles.compactInfo, { minWidth: 0 }]}><Text style={styles.rescueLabel}>{recipe.usedIngredients.length} rescue ingredients suggested</Text>
        <Text style={styles.compactTitle}>{recipe.title}</Text><Text style={styles.compactMeta}>{recipe.match.pantryNameMatchPercent}% name match · review amounts</Text>
        <Text style={styles.needSmall}>{missing ? `${missing} shopping/check-first candidates` : 'Review full ingredients and quantities'}</Text>
      </View>
    </Pressable>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${recipe.title}`} style={styles.smallCookBtn}><Text style={styles.smallCookText}>View</Text></Pressable>
  </View>;
  return <View style={styles.featuredCard}>
    <View style={[styles.heroImage, { height: 240 }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={recipe.title}><LiveRecipeImage uri={recipe.imageUrl} /></Pressable>
      <View style={[styles.heroBadges, { right: 64, flexWrap: 'wrap' }]}><View style={styles.matchBadge}><Text style={styles.matchText}>{recipe.match.pantryNameMatchPercent}% name match</Text></View></View>
      <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'} style={styles.saveButton}><Text style={{ fontSize: 24, color: Colors.primary }}>{saved ? '♥' : '♡'}</Text></Pressable>
      <View style={styles.heroMeta}><Text style={styles.heroMetaText}>Review details for time & servings</Text></View>
    </View>
    <View style={styles.featuredContent}><Pressable onPress={onPress} accessibilityRole="button"><Text style={styles.featuredTitle}>{recipe.title}</Text></Pressable>
      <Text style={styles.featuredDesc}>Suggested using ingredients that need attention today or tomorrow.</Text>
      <View style={styles.pantryRow}>{recipe.match.ingredients.filter(row => row.status === 'PANTRY').slice(0, 4).map((row, index) => <View key={`${row.name}-${index}`} style={styles.pantryPill}><Text style={styles.pantryPillText}>✓ {row.name}</Text></View>)}</View>
      <Text style={styles.needText}>{missing ? `${missing} shopping/check-first candidates` : 'Check full ingredients and amounts before cooking.'}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.cookBtn}><Text style={styles.cookBtnText}>Cook This Tonight</Text></Pressable>
    </View>
  </View>;
}
