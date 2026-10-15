import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import ScreenHeader from '@/components/ScreenHeader';
import PrimaryButton from '@/components/PrimaryButton';
import LiveRecipeCard from '@/components/LiveRecipeCard';
import { useAuth } from '@/context/AuthContext';
import { useRealChef } from '@/context/RealChefContext';
import { filterChefRecipes } from '@/lib/chefRecipes';
import { Colors, Radius } from '@/constants/Theme';
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
  return <PrototypeScreen header={<ScreenHeader title="FreshTrack" subtitle="Smart Rescue Kitchen" showNotification={false} onAvatarPress={() => router.push('/settings')} />}>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search suggested dishes or ingredients…" accessibilityLabel="Search recipe suggestions" style={[ui.card, ui.text, { minHeight: 48 }]} />
    <View style={[ui.row, { flexWrap: 'wrap' }]}><Text style={ui.heading}>♨ RESCUE FIRST</Text>
      <Pressable onPress={() => router.push('/recipe/shopping-list')} accessibilityRole="button" style={ui.pill}><Text style={ui.label}>Shopping List ({state.shopping.length})</Text></Pressable></View>
    <Text style={ui.text}>Today and tomorrow in your household timezone. Refresh after changing Pantry.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {state.ingredients?.ingredients.map(row => <Pressable key={row.pantryItemId} accessibilityRole="button" onPress={() => setQuery(row.name)} style={[ui.pill, { backgroundColor: Colors.cautionAmberBg }]}>
        <Text style={ui.label}>{row.name} · {row.expiresOn}</Text></Pressable>)}
    </ScrollView>
    {state.ingredientsStatus === 'loading' && <ActivityIndicator accessibilityLabel="Loading rescue ingredients" color={Colors.primary} />}
    {!!state.ingredientsError && <Text style={[ui.text, { color: Colors.error }]} accessibilityRole="alert">{state.ingredientsError}</Text>}
    {state.ingredientsStatus === 'ready' && !state.ingredients?.ingredients.length && <Text style={ui.text}>Nothing needs rescuing today or tomorrow. Add or review groceries in Pantry.</Text>}
    <PrimaryButton label="Suggest Recipes" loading={loading} disabled={state.ingredientsStatus === 'loading'} onPress={search} />
    <PrimaryButton label="Refresh Pantry Ingredients" variant="ghost" disabled={loading || state.ingredientsStatus === 'loading'} onPress={() => { setNotice(''); setFilter('All Recipes'); setDiet('Any'); void store.loadIngredients(); }} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {['All Recipes', 'Quick', 'High Match', 'Saved'].map(value => <Pressable key={value} disabled={loading} onPress={() => { setFilter(value); if (value === 'Quick' && state.filtersStatus !== 'ready' && state.suggestions?.recipes.length) void store.loadFilters(); }} accessibilityRole="tab" accessibilityState={{ selected: filter === value, disabled: loading }} style={[ui.pill, filter === value && { backgroundColor: Colors.primary }]}>
        <Text style={[ui.label, filter === value && { color: Colors.white }]}>{value === 'Quick' ? '⚡ 15-Min Quick' : value === 'High Match' ? '80%+ Name Match' : value}</Text></Pressable>)}
    </ScrollView>
    <Text style={ui.label}>Recipe preference · this session</Text>
    <View style={[ui.row, { flexWrap: 'wrap', justifyContent: 'flex-start' }]}>
      {(['Any', 'Vegetarian', 'Vegan'] as const).map(value => <Pressable key={value} disabled={loading} accessibilityRole="tab" accessibilityState={{ selected: diet === value, disabled: loading }}
        style={[ui.pill, value === diet && { backgroundColor: Colors.primary }]} onPress={() => {
          setDiet(value); if (value !== 'Any' && state.filtersStatus !== 'ready' && state.suggestions?.recipes.length) void store.loadFilters();
        }}><Text style={[ui.label, value === diet && { color: Colors.white }]}>{value}</Text></Pressable>)}
    </View>
    <Text style={ui.text}>Quick means 15 minutes total or less. Time and preferences use provider metadata; unknown values are excluded. Filters apply only to the current shortlist.</Text>
    <PrimaryButton label={state.filtersStatus === 'ready' ? 'Refresh Time & Diet Filters' : 'Load Time & Diet Filters'} variant="ghost"
      loading={state.filtersStatus === 'loading'} disabled={state.suggestionsStatus === 'loading' || !state.suggestions?.recipes.length} onPress={() => void store.loadFilters()} />
    {!!state.filtersError && <Text style={[ui.text, { color: Colors.error }]} accessibilityRole="alert">{state.filtersError} Existing suggestions remain available. Choose All Recipes and Any, or retry filters.</Text>}
    <Text style={ui.text}>Saved IDs and shopping items stay in this signed-in session only. Saved shows matches in the current suggestions.</Text>
    {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
    {loading && <Text style={ui.text} accessibilityLiveRegion="polite">{state.filtersStatus === 'loading' ? 'Loading provider time and diet labels…' : 'Finding real recipes using your rescue ingredients…'}</Text>}
    {state.suggestionsStatus === 'error' && <View style={ui.card}><Text style={ui.heading}>Recipes unavailable</Text><Text style={ui.text} accessibilityRole="alert">{state.suggestionsError}</Text>
      <PrimaryButton label="Retry Recipes" onPress={search} /><PrimaryButton label="Open Pantry" variant="ghost" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {state.suggestionsStatus === 'idle' && <Text style={ui.text}>Tap Suggest Recipes to search. Each search uses the recipe service allowance.</Text>}
    {state.suggestionsStatus === 'ready' && !featured && !loading && <View style={ui.card}><Text style={ui.heading}>{state.suggestions?.state === 'NO_NEAR_EXPIRY' ? 'No rescue ingredients yet' : 'No matching recipes'}</Text>
      <Text style={ui.text}>{query || filter !== 'All Recipes' || diet !== 'Any' ? 'Try clearing your search or filters.' : 'Review Pantry ingredients, then try suggestions again.'}</Text>
      <PrimaryButton label="Clear Search & Filters" variant="ghost" onPress={() => { setQuery(''); setFilter('All Recipes'); setDiet('Any'); }} />
      <PrimaryButton label="Open Pantry" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {featured && !loading && <><Text style={ui.label}>◉ TOP WASTE-RESCUE MATCH</Text><LiveRecipeCard recipe={featured} featured saved={state.saved.includes(featured.id)} onSave={() => save(featured.id)} onPress={() => open(featured.id)} />
      <Text style={ui.heading}>Cook With What You Have</Text><Text style={ui.text}>Name matching is a guide. Check ingredient amounts and staples in the recipe.</Text>
      {recipes.slice(1).map(recipe => <LiveRecipeCard key={recipe.id} recipe={recipe} saved={state.saved.includes(recipe.id)} onSave={() => save(recipe.id)} onPress={() => open(recipe.id)} />)}</>}
    <View style={[ui.card, { backgroundColor: Colors.primary, borderRadius: Radius.xl }]}><Text style={[ui.title, { color: Colors.white }]}>✦ AI Fridge Chef</Text>
      <Text style={[ui.text, { color: Colors.white }]}>Filter Pantry suggestions by a dish or ingredient. Recipe directions come from Spoonacular.</Text>
      <TextInput value={scraps} onChangeText={setScraps} placeholder="e.g. Tomato, rice" accessibilityLabel="Filter recipe ingredients" style={[ui.pill, ui.text, { backgroundColor: Colors.white }]} />
      <PrimaryButton label="Find Pantry Recipes" variant="ghost" loading={loading} onPress={() => {
        setQuery(scraps); setFilter('All Recipes'); setDiet('Any'); if (!state.suggestions) search();
      }} /></View>
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://spoonacular.com/food-api').catch(() => setNotice('Unable to open Spoonacular.'))}><Text style={ui.label}>Recipes powered by Spoonacular ↗</Text></Pressable>
  </PrototypeScreen>;
}
