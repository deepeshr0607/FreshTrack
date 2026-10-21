import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PrototypeScreen from '@/components/PrototypeScreen';
import { ChefHeader, ChefIcon, ChefDisclosure, ChefSection, c } from './ChefPresentation';
import PrimaryButton from '@/components/PrimaryButton';
import LiveRecipeCard from '@/components/LiveRecipeCard';
import { useAuth } from '@/context/AuthContext';
import { useRealChef } from '@/context/RealChefContext';
import { filterChefRecipes } from '@/lib/chefRecipes';
import { Colors } from '@/constants/Theme';
export default function LiveRecipesScreen() {
  const { state: auth } = useAuth(); const { state, store } = useRealChef();
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All Recipes'), [scraps, setScraps] = useState(''), [notice, setNotice] = useState('');
  const [diet, setDiet] = useState<'Any' | 'Vegetarian' | 'Vegan'>('Any');
  useFocusEffect(useCallback(() => {
    if (!auth.checking && store.getSnapshot().ingredientsStatus === 'idle') void store.loadIngredients();
  }, [store, auth.checking]));
  const recipes = filterChefRecipes(state.suggestions?.recipes ?? [], query, filter, state.saved, diet);
  const featured = recipes[0], loading = state.suggestionsStatus === 'loading' || state.filtersStatus === 'loading';
  const search = () => { setFilter('All Recipes'); setDiet('Any'); setNotice(''); void store.suggest(); };
  const open = (id: number) => !loading && router.push({ pathname: '/recipe/[id]', params: { id: String(id) } });
  const save = (id: number) => { try { store.save(id); } catch { setNotice('Keep up to 100 saved IDs in this session.'); } };
  return <PrototypeScreen>
    <ChefHeader title="Recipes · AI Chef" count={state.shopping.length} onShopping={() => router.push('/recipe/shopping-list')} onSettings={() => router.push('/settings')} />
    <View style={c.hero}>
      <View style={c.heroTop}><Text style={c.eyebrow}>PANTRY TO PLATE</Text><ChefIcon name="chef-hat" color={Colors.inversePrimary} size={32} /></View>
      <Text accessibilityRole="header" style={c.whiteTitle}>A good meal.{'\n'}A little less waste.</Text>
      <Text style={c.whiteBody}>Find your next favourite with the groceries you already have.</Text>
      <PrimaryButton label="Suggest Recipes" variant="ghost" loading={loading} disabled={state.ingredientsStatus === 'loading'} onPress={search} />
      <Text style={[c.caption, { color: '#D2EFDF' }]}>Each new search uses your recipe service allowance.</Text>
    </View>
    <View style={c.heroTop}><ChefSection title="Use these first" caption="Expiring today or tomorrow in your household" />
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh Pantry Ingredients" disabled={loading || state.ingredientsStatus === 'loading'} onPress={() => { setNotice(''); setFilter('All Recipes'); setDiet('Any'); void store.loadIngredients(); }} style={c.round}><ChefIcon name="refresh" /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {state.ingredients?.ingredients.map(row => <Pressable key={row.pantryItemId} accessibilityRole="button" accessibilityLabel={`Find recipes with ${row.name}`} onPress={() => setQuery(row.name)} style={c.rescuePill}>
        <Text style={c.ingredientName}>{row.name}</Text><Text style={c.caption}>Expiry {row.expiresOn}</Text></Pressable>)}
    </ScrollView>
    {state.ingredientsStatus === 'loading' && <ActivityIndicator accessibilityLabel="Loading rescue ingredients" color={Colors.primary} />}
    {!!state.ingredientsError && <Text style={[c.body, { color: Colors.error }]} accessibilityRole="alert">{state.ingredientsError}</Text>}
    {state.ingredientsStatus === 'ready' && !state.ingredients?.ingredients.length && <View style={c.disclosureBody}><Text style={c.body}>Nothing needs rescuing today or tomorrow. Review your Pantry to get started.</Text></View>}
    <View style={c.search}><ChefIcon name="magnify" color={Colors.outline} /><TextInput value={query} onChangeText={setQuery} placeholder="Find a dish or ingredient…" accessibilityLabel="Search recipe suggestions" style={c.input} /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {['All Recipes', 'Quick', 'High Match', 'Saved'].map(value => <Pressable key={value} disabled={loading} onPress={() => { setFilter(value); if (value === 'Quick' && state.filtersStatus !== 'ready' && state.suggestions?.recipes.length) void store.loadFilters(); }} accessibilityRole="tab" accessibilityState={{ selected: filter === value, disabled: loading }} style={[c.pill, filter === value && c.selected]}>
        <Text style={[c.label, filter === value && c.whiteLabel]}>{value === 'Quick' ? '15-Min Quick' : value === 'High Match' ? '80%+ Match' : value}</Text></Pressable>)}
    </ScrollView>
    <ChefDisclosure title={`Time & diet preferences · ${diet}`}>
      <View style={c.row}>{(['Any', 'Vegetarian', 'Vegan'] as const).map(value => <Pressable key={value} disabled={loading} accessibilityRole="tab" accessibilityState={{ selected: diet === value, disabled: loading }} style={[c.pill, value === diet && c.selected]} onPress={() => {
        setDiet(value); if (value !== 'Any' && state.filtersStatus !== 'ready' && state.suggestions?.recipes.length) void store.loadFilters();
      }}><Text style={[c.label, value === diet && c.whiteLabel]}>{value}</Text></Pressable>)}</View>
      <Text style={c.caption}>Quick means 15 minutes total or less. Time/diet filters use provider labels; unknown values are excluded. Filters apply to this shortlist only.</Text>
      <PrimaryButton label={state.filtersStatus === 'ready' ? 'Refresh Time & Diet Filters' : 'Load Time & Diet Filters'} variant="ghost" loading={state.filtersStatus === 'loading'} disabled={state.suggestionsStatus === 'loading' || !state.suggestions?.recipes.length} onPress={() => void store.loadFilters()} />
      <Text style={c.caption}>Saved IDs and shopping items last for this signed-in session. Saved shows matches in the current suggestions.</Text>
    </ChefDisclosure>
    {!!state.filtersError && <View style={c.card}><Text style={c.body} accessibilityRole="alert">{state.filtersError} Choose All Recipes and Any to browse without these filters, or retry them.</Text></View>}
    {!!notice && <Text style={c.label} accessibilityLiveRegion="polite">{notice}</Text>}
    {loading && <View style={c.empty}><ActivityIndicator color={Colors.primary} /><Text style={c.body} accessibilityLiveRegion="polite">{state.filtersStatus === 'loading' ? 'Checking time & diet labels…' : 'Finding inspiration for your ingredients…'}</Text></View>}
    {state.suggestionsStatus === 'error' && <View style={c.empty}><ChefIcon name="wifi-off" size={32} /><ChefSection title="Let’s try that again" /><Text style={c.body} accessibilityRole="alert">{state.suggestionsError}</Text>
      <PrimaryButton label="Retry Recipes" onPress={search} /><PrimaryButton label="Open Pantry" variant="ghost" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {state.suggestionsStatus === 'idle' && <View style={c.empty}><ChefIcon name="silverware-fork-knife" size={34} /><ChefSection title="What’s cooking tonight?" caption="Tap Suggest Recipes when you’re ready." /></View>}
    {state.suggestionsStatus === 'ready' && !featured && !loading && <View style={c.empty}><ChefIcon name="food-variant" size={32} /><ChefSection title={state.suggestions?.state === 'NO_NEAR_EXPIRY' ? 'No rescue ingredients yet' : 'No matching recipes'} />
      <Text style={c.body}>{query || filter !== 'All Recipes' || diet !== 'Any' ? 'Try clearing your search or filters.' : 'Review Pantry ingredients, then try suggestions again.'}</Text>
      <PrimaryButton label="Clear Search & Filters" variant="ghost" onPress={() => { setQuery(''); setFilter('All Recipes'); setDiet('Any'); }} /><PrimaryButton label="Open Pantry" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {featured && !loading && <><ChefSection title="Tonight’s rescue pick" caption="Name matching is a guide. Check amounts in the recipe." /><LiveRecipeCard recipe={featured} featured saved={state.saved.includes(featured.id)} onSave={() => save(featured.id)} onPress={() => open(featured.id)} />
      {recipes.length > 1 && <ChefSection title="More from your pantry" />}{recipes.slice(1).map(recipe => <LiveRecipeCard key={recipe.id} recipe={recipe} saved={state.saved.includes(recipe.id)} onSave={() => save(recipe.id)} onPress={() => open(recipe.id)} />)}</>}
    <View style={c.hero}><View style={c.heroTop}><Text style={c.eyebrow}>AI FRIDGE CHEF</Text><ChefIcon name="fridge-outline" color={Colors.inversePrimary} size={28} /></View><Text style={[c.whiteTitle, { fontSize: 23, lineHeight: 31 }]}>Got something in mind?</Text>
      <Text style={c.whiteBody}>Find a dish or ingredient within your Pantry suggestions.</Text>
      <TextInput value={scraps} onChangeText={setScraps} placeholder="e.g. Tomato, rice" accessibilityLabel="Filter recipe ingredients" style={[c.pill, c.body]} />
      <PrimaryButton label="Find Pantry Recipes" variant="ghost" loading={loading} onPress={() => { setQuery(scraps); setFilter('All Recipes'); setDiet('Any'); if (!state.suggestions) search(); }} /></View>
    <Pressable accessibilityRole="link" accessibilityLabel="Recipes powered by Spoonacular" onPress={() => void Linking.openURL('https://spoonacular.com/food-api').catch(() => setNotice('Unable to open Spoonacular.'))} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={c.caption}>Recipes powered by Spoonacular ↗</Text></Pressable>
  </PrototypeScreen>;
}
