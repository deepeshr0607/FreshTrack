import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { backToRecipes, ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useMockRecipes } from '@/context/MockRecipeContext';

export default function ShoppingList() {
  const { state, dispatch } = useMockRecipes();
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : backToRecipes()}>
    <Text style={ui.title}>Shopping List</Text><Text style={ui.text}>Missing ingredients from your selected recipes.</Text>
    {!state.shopping.length && <View style={ui.card}><Text style={ui.heading}>Your list is empty</Text>
      <Text style={ui.text}>Open a recipe and add its missing ingredients.</Text><PrimaryButton label="Browse Recipes" onPress={backToRecipes} /></View>}
    {state.shopping.map((item) => <Pressable key={item.name} style={ui.card} accessibilityRole="checkbox"
      accessibilityLabel={item.name} accessibilityState={{ checked: item.checked }} onPress={() => dispatch({ type: 'toggle', name: item.name })}>
      <Text style={[ui.text, item.checked && { textDecorationLine: 'line-through' }]}>{item.checked ? '☑' : '□'} {item.name}</Text>
    </Pressable>)}
    {!!state.shopping.length && <PrimaryButton label="Clear Purchased Items" disabled={!state.shopping.some((item) => item.checked)}
      onPress={() => dispatch({ type: 'clear-checked' })} />}
  </PrototypeScreen>;
}
