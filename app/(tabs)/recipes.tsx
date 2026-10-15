import { useAuth } from '@/context/AuthContext';
import LiveRecipesScreen from '@/features/chef/LiveRecipesScreen';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import ScreenHeader from '@/components/ScreenHeader';
import RecipeCard from '@/components/RecipeCard';
import PrimaryButton from '@/components/PrimaryButton';
import PreviewState, { usePreviewState } from '@/components/PreviewState';
import { Colors, Radius, Spacing } from '@/constants/Theme';
import { MOCK_RECIPES } from '@/lib/mock';
import { filterRecipes, recipeInventory } from '@/lib/recipes';
import { useMockRecipes } from '@/context/MockRecipeContext';
import { useMockPantry } from '@/context/MockPantryContext';

function DemoRecipesScreen() {
  const { items } = useMockPantry();
  const { state, dispatch } = useMockRecipes();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All Recipes');
  const [scraps, setScraps] = useState('');
  const [notice, setNotice] = useState('');
  const [showAll, setShowAll] = useState(false);
  const load = usePreviewState();
  const recipes = filterRecipes(load.empty ? [] : MOCK_RECIPES, query, filter, state.saved);
  const featured = recipes[0];
  const recommendations = !showAll && !query && filter === 'All Recipes'
    ? recipes.filter((recipe) => recipe.imageKey !== 'rigatoni')
    : recipes.slice(1);
  const nearExpiry = items.filter((item) => item.status === 'ACTIVE' && item.daysLeft >= 0 && item.daysLeft <= 2);
  const open = (id: string) => router.push({ pathname: '/recipe/[id]', params: { id } });
  const card = (recipe: typeof MOCK_RECIPES[number], featured = false) => {
    const inventory = recipeInventory(recipe, items);
    return <RecipeCard key={recipe.id} featured={featured} recipe={{ ...recipe,
      pantryItems: inventory.available.map((item) => item.name),
      rescuesItems: inventory.available.map((item) => item.name), missingIngredients: inventory.missing }}
      saved={state.saved.includes(recipe.id)} onSave={() => dispatch({ type: 'save', id: recipe.id })}
      onPress={() => open(recipe.id)} onCook={() => open(recipe.id)} />;
  };
  return <PrototypeScreen header={<ScreenHeader title="FreshTrack" subtitle="Smart Rescue Kitchen"
    showNotification={false} onAvatarPress={() => router.push('/settings')} />}>
    <View style={ui.row}>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search by ingredient, dish or prep…"
        accessibilityLabel="Search recipes" style={[ui.text, ui.card, { flex: 1, minHeight: 48 }]} />
      <Pressable onPress={() => { setFilter(filter === 'Saved' ? 'All Recipes' : 'Saved'); }}
        accessibilityRole="button" accessibilityLabel="Saved recipes" style={ui.pill}><Text style={ui.label}>♡</Text></Pressable>
    </View>
    <View style={ui.row}><Text style={ui.heading}>♨ RESCUE FIRST</Text>
      <Pressable onPress={() => router.push('/recipe/shopping-list')} accessibilityRole="button" style={ui.pill}>
        <Text style={ui.label}>Shopping List ({state.shopping.length})</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {nearExpiry.map((item) => <Pressable key={item.id} onPress={() => setQuery(item.name.split(' ').at(-1) ?? item.name)}
        accessibilityRole="button" style={[ui.pill, { backgroundColor: item.daysLeft <= 1 ? Colors.criticalRoseBg : Colors.cautionAmberBg }]}>
        <Text style={ui.label}>{item.imageEmoji} {item.name} · {item.daysLeft}d left</Text></Pressable>)}
      {!nearExpiry.length && <Text style={ui.text}>Nothing needs rescuing in the next 48 hours.</Text>}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {['All Recipes', 'Quick', 'High Match', 'Saved'].map((value) => <Pressable key={value}
        accessibilityRole="tab" accessibilityState={{ selected: value === filter }} onPress={() => setFilter(value)}
        style={[ui.pill, filter === value && { backgroundColor: Colors.primary }]}>
        <Text style={[ui.label, filter === value && { color: Colors.white }]}>{value === 'Quick' ? '⚡ 15-Min Quick' : value}</Text></Pressable>)}
    </ScrollView>
    {load.status !== 'ready' ? <PreviewState status={load.status} retry={load.retry} /> : featured ? <>
      <View style={ui.row}><Text style={ui.label}>◉ TOP WASTE-RESCUE MATCH</Text>
        <Pressable onPress={load.retry} accessibilityRole="button"><Text style={ui.label}>Refresh</Text></Pressable></View>
      {card(featured, true)}
      <View style={ui.row}><Text style={ui.heading}>Cook With What You Have</Text>
        <Pressable onPress={() => { setQuery(''); setFilter('All Recipes'); setShowAll(!showAll); }} accessibilityRole="button">
          <Text style={ui.label}>{showAll ? 'Show Less' : `See All (${MOCK_RECIPES.length})`}</Text></Pressable></View>
      <Text style={ui.text}>Recommended directly from your pantry contents</Text>
      {recommendations.map((recipe) => card(recipe))}
    </> : <View style={ui.card}><Text style={ui.heading}>No matching recipes</Text>
      <Text style={ui.text}>Try another ingredient or save a recipe to see it here.</Text>
      <PrimaryButton label="Show All Recipes" onPress={() => { setQuery(''); setFilter('All Recipes'); load.retry(); }} /></View>}
    <View style={[ui.card, { backgroundColor: Colors.primary, borderRadius: Radius.xl, marginTop: Spacing.base }]}>
      <Text style={[ui.title, { color: Colors.white }]}>✦ AI Fridge Chef</Text>
      <Text style={[ui.text, { color: Colors.white }]}>Type the scraps or leftovers you have to find a sample zero-waste recipe.</Text>
      <TextInput value={scraps} onChangeText={setScraps} placeholder="e.g. Spinach, sour cream" accessibilityLabel="Leftover ingredients"
        style={[ui.text, ui.pill, { backgroundColor: Colors.white }]} />
      <PrimaryButton label="✦ Magic Recipe" onPress={() => {
        if (!scraps.trim()) { setNotice('Enter an ingredient first.'); return; }
        const match = MOCK_RECIPES.find((recipe) => scraps.toLowerCase().split(',').some((part) =>
          part.trim() && `${recipe.title} ${recipe.rescuesItems.join(' ')}`.toLowerCase().includes(part.trim())));
        if (match) { setNotice(''); open(match.id); }
        else setNotice('No sample recipe matches those leftovers. Try spinach, eggs or berries.');
      }} variant="ghost" />
      {!!notice && <Text accessibilityLiveRegion="polite" style={[ui.text, { color: Colors.white }]}>{notice}</Text>}
    </View>
  </PrototypeScreen>;
}

export default function RecipesScreen() {
  const { state } = useAuth();
  return state.demo ? <DemoRecipesScreen /> : <LiveRecipesScreen />;
}
