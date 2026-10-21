import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { backToRecipes } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useRealChef } from '@/context/RealChefContext';
import { ChefHeader, ChefIcon, ChefSection, ChefDisclosure, c } from './ChefPresentation';
import { Colors } from '@/constants/Theme';
export default function LiveShoppingListScreen() {
  const { state, store } = useRealChef();
  const purchased = state.shopping.filter(row => row.checked).length;
  return <PrototypeScreen>
    <ChefHeader title="Shopping list" onBack={() => router.canGoBack() ? router.back() : backToRecipes()} />
    <View style={c.hero}><View style={c.heroTop}><Text style={c.eyebrow}>SHOP WITH A PLAN</Text><ChefIcon name="basket-outline" color={Colors.inversePrimary} size={30} /></View>
      <Text accessibilityRole="header" style={c.whiteTitle}>{state.shopping.length ? `${state.shopping.length - purchased} left to buy.` : 'A little list.\nA smarter shop.'}</Text>
      <Text style={c.whiteBody}>{state.shopping.length ? `${purchased} of ${state.shopping.length} checked off` : 'Add missing ingredients from a recipe to get started.'}</Text>
      {!!state.shopping.length && <View style={c.progressTrack}><View style={[c.progressFill, { width: `${purchased / state.shopping.length * 100}%` }]} /></View>}
    </View>
    <Text style={c.caption}>Session list · restarting or signing out clears it.</Text>
    {!state.shopping.length && <View style={c.empty}><ChefIcon name="basket-plus-outline" size={40} /><ChefSection title="Ready for your next recipe" caption="Choose missing ingredients or kitchen checks in a recipe." /><PrimaryButton label="Browse Recipes" onPress={backToRecipes} /></View>}
    {!!state.shopping.length && <ChefSection title="Your ingredients" caption="Check amounts and your kitchen before buying." />}
    {state.shopping.map(row => <Pressable key={row.name} style={[c.checkRow, { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.surfaceContainer }]} accessibilityRole="checkbox" accessibilityLabel={row.name} accessibilityState={{ checked: row.checked }} onPress={() => store.toggleShopping(row.name)}>
      <ChefIcon name={row.checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={26} /><Text style={[c.body, { flex: 1 }, row.checked && { textDecorationLine: 'line-through', color: Colors.outline }]}>{row.name}</Text></Pressable>)}
    {!!state.shopping.length && <PrimaryButton label="Clear Purchased Items" disabled={!purchased} onPress={() => store.clearPurchased()} />}
    <ChefDisclosure title="About this list"><Text style={c.body}>Names come from your recipe selections. Amounts are not a shopping prescription: review the recipe and your existing supplies. Items stay only in this signed-in session, shared with Dashboard Shopping.</Text></ChefDisclosure>
  </PrototypeScreen>;
}
