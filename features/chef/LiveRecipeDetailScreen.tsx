import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import PrototypeScreen, { backToRecipes, ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { LiveRecipeImage } from '@/components/LiveRecipeCard';
import { useRealChef } from '@/context/RealChefContext';
import { useAuth } from '@/context/AuthContext';
import { matchingLabel } from '@/lib/chefRecipes';
import { recipeExternalUrl } from '@/lib/chefApi';
import { Colors } from '@/constants/Theme';
export default function LiveRecipeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>(); const id = typeof params.id === 'string' ? params.id : '';
  return <Detail key={id} id={id} />;
}
function Detail({ id }: { id: string }) {
  const { state: auth } = useAuth(); const { state, store } = useRealChef();
  const [selected, setSelected] = useState<string[]>([]), [notice, setNotice] = useState('');
  useFocusEffect(useCallback(() => { if (!auth.checking) void store.loadDetail(id); }, [id, store, auth.checking]));
  const recipe = state.detailId === id && state.detailStatus === 'ready' ? state.recipe : null;
  useEffect(() => { setSelected(recipe?.match.shoppingItems.filter(row => !row.checkFirst).map(row => row.name) ?? []); setNotice(''); }, [recipe]);
  const open = (value: string) => { const url = recipeExternalUrl(value); if (url) void Linking.openURL(url).catch(() => setNotice('Unable to open the recipe source.')); };
  return <PrototypeScreen back={backToRecipes}>
    {!recipe ? <View style={ui.card}><Text style={ui.title}>Recipe Details</Text>
      {state.detailStatus === 'loading' ? <><ActivityIndicator color={Colors.primary} accessibilityLabel="Loading recipe details" /><Text style={ui.text}>Checking current ingredients and loading recipe instructions…</Text></>
        : <><Text style={ui.text} accessibilityRole="alert">{state.detailError || 'Refresh to view the current recipe. Recipes can change with your Pantry.'}</Text><PrimaryButton label="Retry Details" onPress={() => void store.loadDetail(id)} /></>}
      <PrimaryButton label="Browse Recipes" variant="ghost" onPress={backToRecipes} /></View> : <>
      <LiveRecipeImage uri={recipe.imageUrl} /><Text style={ui.title}>{recipe.title}</Text>
      <Text style={ui.text}>{recipe.readyInMinutes === null ? 'Total time unavailable' : `${recipe.readyInMinutes} min total`} · {recipe.servings === null ? 'Servings unavailable' : `${recipe.servings} servings`}</Text>
      <Text style={ui.text}>{recipe.preparationMinutes === null ? 'Prep time unavailable' : `Prep: ${recipe.preparationMinutes} min`} · {recipe.cookingMinutes === null ? 'Cooking time unavailable' : `Cooking: ${recipe.cookingMinutes} min`}</Text>
      <PrimaryButton label={state.saved.includes(recipe.id) ? '♥ Saved — tap to remove' : '♡ Save Recipe'} variant="ghost" onPress={() => { try { store.save(recipe.id); } catch { setNotice('Saved recipe limit reached for this session.'); } }} />
      <View style={ui.card}><Text style={ui.heading}>Ingredients & Pantry Match</Text><Text style={ui.text}>{recipe.match.pantryNameMatchPercent}% name match · Check amounts for the provider servings above.</Text>
        {recipe.match.ingredients.map((row, index) => <View key={`${row.canonicalName}-${index}`} style={{ gap: 6 }}><Text style={ui.text}>{row.description}</Text><Text style={ui.label}>{matchingLabel(row)}</Text>
          {row.pantryItemIds.slice(0, 3).map(itemId => <Pressable key={itemId} accessibilityRole="button" onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: itemId } })} style={ui.pill}><Text style={ui.label}>Review Pantry Entry</Text></Pressable>)}</View>)}
        {!recipe.match.ingredients.length && <Text style={ui.text}>Ingredient information is unavailable. Review the original source.</Text>}
      </View>
      <View style={ui.card}><Text style={ui.heading}>Missing Ingredients & Kitchen Checks</Text>
        <Text style={ui.text}>Choose what to add. Staples start unchecked. No exact match can also mean a product name needs review.</Text>
        {recipe.match.shoppingItems.map(row => {
          const checked = selected.includes(row.name);
          return <Pressable key={row.name} accessibilityRole="checkbox" accessibilityLabel={row.name} accessibilityState={{ checked }} style={ui.pill}
            onPress={() => setSelected(current => checked ? current.filter(name => name !== row.name) : [...current, row.name])}>
            <Text style={ui.text}>{checked ? '☑' : '□'} {row.name}</Text><Text style={ui.label}>{row.checkFirst ? 'Check your kitchen first' : row.reason === 'INSUFFICIENT' ? 'More needed — review amount' : 'No exact Pantry match'}</Text></Pressable>;
        })}
        {!recipe.match.shoppingItems.length && <Text style={ui.text}>No missing-name candidates. Review any amount or unit checks above.</Text>}
        <PrimaryButton label="Add Selected to Shopping List" disabled={!selected.length} onPress={() => {
          try { store.addShopping(selected); setNotice('Added selected names. Existing shopping entries are kept once.'); }
          catch { setNotice('Unable to add: clear purchased items or review the selected names.'); }
        }} />
        <PrimaryButton label={`View Shopping List (${state.shopping.length})`} variant="ghost" onPress={() => router.push('/recipe/shopping-list')} />
      </View>
      <View style={ui.card}><Text style={ui.heading}>Cooking Instructions</Text>
        {recipe.instructionStatus === 'UNAVAILABLE' ? <Text style={ui.text}>Instructions are unavailable from the provider. Check the original source before cooking.</Text>
          : recipe.instructionGroups.length ? recipe.instructionGroups.map((group, index) => <View key={index} style={{ gap: 10 }}>
            {!!group.name && <Text style={ui.heading}>{group.name}</Text>}{group.steps.map(step => <Text key={step.number} style={ui.text}>{step.number}. {step.text}</Text>)}
          </View>) : <Text style={ui.text}>{recipe.instructions}</Text>}
      </View>
      <View style={ui.card}><Text style={ui.heading}>Recipe Source</Text>
        <Text style={ui.text}>{recipe.source.name || 'Source name unavailable'}{recipe.source.credits ? ` · ${recipe.source.credits}` : ''}</Text>
        {!!recipe.source.license && <Text style={ui.text}>Provider license information: {recipe.source.license}</Text>}
        {!!recipe.source.url && <PrimaryButton label="Open Original Recipe" variant="ghost" onPress={() => open(recipe.source.url!)} />}
        <PrimaryButton label="View on Spoonacular" variant="ghost" onPress={() => open(recipe.providerUrl)} />
      </View>
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <Text style={ui.text}>After cooking, review Pantry and confirm Used only for purchases you finished. Opening a recipe does not change groceries.</Text>
      <PrimaryButton label="Review Pantry After Cooking" onPress={() => router.push('/(tabs)/pantry')} />
    </>}
  </PrototypeScreen>;
}
