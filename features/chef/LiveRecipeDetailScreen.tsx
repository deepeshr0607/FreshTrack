import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import PrototypeScreen, { backToRecipes } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { LiveRecipeImage } from '@/components/LiveRecipeCard';
import { useRealChef } from '@/context/RealChefContext';
import { useAuth } from '@/context/AuthContext';
import { matchingLabel } from '@/lib/chefRecipes';
import { recipeExternalUrl } from '@/lib/chefApi';
import { ChefHeader, ChefIcon, ChefSection, ChefDisclosure, c } from './ChefPresentation';
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
  return <PrototypeScreen>
    <ChefHeader title="Recipe details" onBack={backToRecipes} count={state.shopping.length} onShopping={() => router.push('/recipe/shopping-list')} />
    {!recipe ? <View style={c.card}><Text style={c.title}>Recipe Details</Text>
      {state.detailStatus === 'loading' ? <><ActivityIndicator color={Colors.primary} accessibilityLabel="Loading recipe details" /><Text style={c.body}>Checking current ingredients and loading recipe instructions…</Text></>
        : <><Text style={c.body} accessibilityRole="alert">{state.detailError || 'Refresh to view the current recipe. Recipes can change with your Pantry.'}</Text><PrimaryButton label="Retry Details" onPress={() => void store.loadDetail(id)} /></>}
      <PrimaryButton label="Browse Recipes" variant="ghost" onPress={backToRecipes} /></View> : <>
      <LiveRecipeImage uri={recipe.imageUrl} height={230} /><Text accessibilityRole="header" style={c.title}>{recipe.title}</Text>
      <View style={c.metrics}><View style={c.metric}><ChefIcon name="clock-outline" size={18} /><Text style={c.metricValue}>{recipe.readyInMinutes === null ? '—' : `${recipe.readyInMinutes} min`}</Text><Text style={c.caption}>{recipe.readyInMinutes === null ? 'Total time unavailable' : 'Total time'}</Text></View>
        <View style={c.metric}><ChefIcon name="account-group-outline" size={18} /><Text style={c.metricValue}>{recipe.servings ?? '—'}</Text><Text style={c.caption}>{recipe.servings === null ? 'Servings unavailable' : 'Servings'}</Text></View></View>
      <ChefDisclosure title="Preparation & cooking time"><Text style={c.body}>{recipe.preparationMinutes === null ? 'Prep time unavailable' : `Prep: ${recipe.preparationMinutes} min`} · {recipe.cookingMinutes === null ? 'Cooking time unavailable' : `Cooking: ${recipe.cookingMinutes} min`}</Text></ChefDisclosure>
      <PrimaryButton label={state.saved.includes(recipe.id) ? '♥ Saved — tap to remove' : '♡ Save Recipe'} variant="ghost" onPress={() => { try { store.save(recipe.id); } catch { setNotice('Saved recipe limit reached for this session.'); } }} />
      <View style={c.card}><ChefSection title="Ingredients" caption="What you have, and what needs checking" /><Text style={c.caption}>{recipe.match.pantryNameMatchPercent}% name match · Check amounts for the provider servings above.</Text>
        {recipe.match.ingredients.map((row, index) => <View key={`${row.canonicalName}-${index}`} style={c.ingredient}><Text style={c.body}>{row.description}</Text><View style={c.ingredientStatus}><ChefIcon name={row.status === 'PANTRY' ? 'check-circle-outline' : 'information-outline'} size={17} /><Text style={[c.label, { flex: 1 }]}>{matchingLabel(row)}</Text></View>
          {row.pantryItemIds.slice(0, 3).map(itemId => <Pressable key={itemId} accessibilityRole="button" onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: itemId } })} style={c.pill}><Text style={c.label}>Review Pantry Entry</Text></Pressable>)}</View>)}
        {!recipe.match.ingredients.length && <Text style={c.body}>Ingredient information is unavailable. Review the original source.</Text>}
      </View>
      <View style={c.card}><ChefSection title="Complete your ingredients" caption="Choose what to add. Check your staples before buying." />
        {recipe.match.shoppingItems.map(row => {
          const checked = selected.includes(row.name);
          return <Pressable key={row.name} accessibilityRole="checkbox" accessibilityLabel={row.name} accessibilityState={{ checked }} style={c.checkRow}
            onPress={() => setSelected(current => checked ? current.filter(name => name !== row.name) : [...current, row.name])}>
            <ChefIcon name={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={25} /><View style={{ flex: 1 }}><Text style={c.body}>{row.name}</Text><Text style={c.caption}>{row.checkFirst ? 'Check your kitchen first' : row.reason === 'INSUFFICIENT' ? 'More needed — review amount' : 'No exact Pantry match'}</Text></View></Pressable>;
        })}
        {!recipe.match.shoppingItems.length && <Text style={c.body}>No missing-name candidates. Review any amount or unit checks above.</Text>}
        <PrimaryButton label="Add to Shopping List" accessibilityLabel="Add Selected to Shopping List" disabled={!selected.length} onPress={() => {
          try { store.addShopping(selected); setNotice('Added selected names. Existing shopping entries are kept once.'); }
          catch { setNotice('Unable to add: clear purchased items or review the selected names.'); }
        }} />
        <PrimaryButton label={`View Shopping List (${state.shopping.length})`} variant="ghost" onPress={() => router.push('/recipe/shopping-list')} />
      </View>
      <View style={c.card}><Text style={c.sectionTitle}>Cooking Instructions</Text>
        {recipe.instructionStatus === 'UNAVAILABLE' ? <Text style={c.body}>Instructions are unavailable from the provider. Check the original source before cooking.</Text>
          : recipe.instructionGroups.length ? recipe.instructionGroups.map((group, index) => <View key={index} style={{ gap: 10 }}>
            {!!group.name && <Text style={c.sectionTitle}>{group.name}</Text>}{group.steps.map(step => <View key={step.number} style={c.step}><Text style={c.stepNumber}>{step.number}</Text><Text style={[c.body, { flex: 1 }]}>{step.text}</Text></View>)}
          </View>) : <Text style={c.body}>{recipe.instructions}</Text>}
      </View>
      <ChefDisclosure title="Recipe source & credits">
        <Text style={c.body}>{recipe.source.name || 'Source name unavailable'}{recipe.source.credits ? ` · ${recipe.source.credits}` : ''}</Text>
        {!!recipe.source.license && <Text style={c.body}>Provider license information: {recipe.source.license}</Text>}
        {!!recipe.source.url && <PrimaryButton label="Open Original Recipe" variant="ghost" onPress={() => open(recipe.source.url!)} />}
        <PrimaryButton label="View on Spoonacular" variant="ghost" onPress={() => open(recipe.providerUrl)} />
      </ChefDisclosure>
      {!!notice && <Text style={c.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <Text style={c.body}>After cooking, review Pantry and confirm Used only for purchases you finished. Opening a recipe does not change groceries.</Text>
      <PrimaryButton label="Review Pantry After Cooking" onPress={() => router.push('/(tabs)/pantry')} />
    </>}
  </PrototypeScreen>;
}
