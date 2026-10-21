import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Colors, Radius } from '@/constants/Theme';
import { ChefIcon, c } from '@/features/chef/ChefPresentation';
import type { ChefSuggestionsData } from '@/types/api';
export function LiveRecipeImage({ uri, height = 240 }: { uri: string | null; height?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <View style={{ height, width: '100%', backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {uri && !failed ? <Image source={{ uri }} accessibilityLabel="Recipe photo" onError={() => setFailed(true)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      : <><ChefIcon name="silverware-fork-knife" color={Colors.outline} size={28} /><Text style={c.caption}>Photo unavailable</Text></>}
  </View>;
}
export default function LiveRecipeCard({ recipe, featured, saved, onSave, onPress }: {
  recipe: ChefSuggestionsData['recipes'][number]; featured?: boolean; saved: boolean; onSave(): void; onPress(): void;
}) {
  const missing = recipe.match.shoppingItems.length;
  const time = recipe.metadata?.readyInMinutes;
  if (!featured) return <View style={c.compact}>
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${recipe.title}, ${recipe.match.pantryNameMatchPercent}% name match`} style={{ flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 }}>
      <View style={c.thumb}><LiveRecipeImage uri={recipe.imageUrl} height={88} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text style={c.compactTitle}>{recipe.title}</Text><Text style={c.caption}>{recipe.match.pantryNameMatchPercent}% name match · {time ? `${time} min` : 'Time unverified'}</Text>
        <Text style={c.label}>{missing ? `${missing} to check or buy` : 'Review ingredient amounts'}</Text></View>
    </Pressable>
    <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><ChefIcon name={saved ? 'heart' : 'heart-outline'} size={20} /></Pressable>
  </View>;
  return <View style={c.featured}>
    <View style={c.imageWrap}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={recipe.title}><LiveRecipeImage uri={recipe.imageUrl} height={205} /></Pressable>
      <View style={c.imageBadge}><Text style={c.label}>{recipe.match.pantryNameMatchPercent}% name match</Text></View>
      <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'} style={c.save}><ChefIcon name={saved ? 'heart' : 'heart-outline'} size={24} /></Pressable>
    </View>
    <View style={c.featuredBody}><Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${recipe.title}`}><Text style={c.recipeTitle}>{recipe.title}</Text></Pressable>
      <View style={c.row}><ChefIcon name="clock-outline" size={17} /><Text style={c.caption}>{time ? `${time} min total` : 'Check time in recipe details'}</Text>{recipe.metadata?.vegan === true ? <Text style={c.tag}>Vegan · provider tag</Text> : recipe.metadata?.vegetarian === true ? <Text style={c.tag}>Vegetarian · provider tag</Text> : null}</View>
      <View style={c.row}>{recipe.match.ingredients.filter(row => row.status === 'PANTRY').slice(0, 4).map((row, index) => <Text key={`${row.name}-${index}`} style={c.tag}>✓ {row.name}</Text>)}</View>
      <Text style={c.caption}>{missing ? `${missing} ${missing === 1 ? 'ingredient' : 'ingredients'} to buy or check in your kitchen` : 'Review full ingredients and amounts before cooking.'}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Cook This Tonight" style={[c.pill, c.selected, { alignItems: 'center' }]}><Text style={[c.label, c.whiteLabel]}>Cook This Tonight →</Text></Pressable>
    </View>
  </View>;
}
