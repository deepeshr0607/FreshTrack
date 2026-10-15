import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { backToRecipes, ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useRealChef } from '@/context/RealChefContext';
export default function LiveShoppingListScreen() {
  const { state, store } = useRealChef();
  return <PrototypeScreen back={() => router.canGoBack() ? router.back() : backToRecipes()}><Text style={ui.title}>Shopping List</Text>
    <Text style={ui.text}>Names selected from recipe reviews. Check amounts before buying. This list stays in the current signed-in session; restarting or signing out clears it.</Text>
    {!state.shopping.length && <View style={ui.card}><Text style={ui.heading}>Your list is empty</Text><Text style={ui.text}>Open a recipe and choose its missing ingredients or kitchen checks.</Text>
      <PrimaryButton label="Browse Recipes" onPress={backToRecipes} /></View>}
    {state.shopping.map(row => <Pressable key={row.name} style={ui.card} accessibilityRole="checkbox" accessibilityLabel={row.name} accessibilityState={{ checked: row.checked }} onPress={() => store.toggleShopping(row.name)}>
      <Text style={[ui.text, row.checked && { textDecorationLine: 'line-through' }]}>{row.checked ? '☑' : '□'} {row.name}</Text></Pressable>)}
    {!!state.shopping.length && <PrimaryButton label="Clear Purchased Items" disabled={!state.shopping.some(row => row.checked)} onPress={() => store.clearPurchased()} />}
  </PrototypeScreen>;
}
