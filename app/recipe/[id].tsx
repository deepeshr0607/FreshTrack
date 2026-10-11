import React, { useState } from 'react';
import { Image, Modal, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import PrototypeScreen, { backToRecipes, ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { MOCK_RECIPES } from '@/lib/mock';
import { recipeInventory } from '@/lib/recipes';
import { recipeImages } from '@/lib/designAssets';
import { useMockRecipes } from '@/context/MockRecipeContext';
import { useMockPantry } from '@/context/MockPantryContext';
import { Colors, Radius } from '@/constants/Theme';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = MOCK_RECIPES.find((entry) => entry.id === id);
  const { items, dispatch: pantryDispatch } = useMockPantry();
  const { state, dispatch } = useMockRecipes();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  if (!recipe) return <PrototypeScreen back={backToRecipes}><Text style={ui.title}>Recipe unavailable</Text>
    <PrimaryButton label="Browse Recipes" onPress={backToRecipes} /></PrototypeScreen>;
  const inventory = recipeInventory(recipe, items);
  const cooked = state.cooked.includes(recipe.id);
  return <PrototypeScreen back={backToRecipes}>
    <Image source={recipeImages[recipe.imageKey]} style={{ width: '100%', height: 240, borderRadius: Radius.lg }} />
    <Text style={ui.title}>{recipe.title}</Text><Text style={ui.text}>{recipe.prepMinutes} min · {recipe.difficulty} · {recipe.calories} kcal</Text>
    <PrimaryButton variant="ghost" label={state.saved.includes(id) ? '♥ Saved — tap to remove' : '♡ Save Recipe'}
      onPress={() => dispatch({ type: 'save', id })} />
    <View style={ui.card}><Text style={ui.heading}>From Your Pantry</Text>
      {inventory.available.map((item) => <Text key={item.id} style={ui.text}>✓ {item.name} · {item.quantity} {item.unit}</Text>)}
      {!inventory.available.length && <Text style={ui.text}>These ingredients are no longer in your active pantry.</Text>}
    </View>
    <View style={ui.card}><Text style={ui.heading}>Missing Ingredients</Text>
      {inventory.missing.map((ingredient) => <Text key={ingredient} style={ui.text}>• {ingredient}</Text>)}
      {!inventory.missing.length && <Text style={ui.label}>All ingredients in stock</Text>}
      <PrimaryButton label="Add Missing to Shopping List" disabled={!inventory.missing.length}
        onPress={() => { dispatch({ type: 'add', ingredients: inventory.missing }); setNotice('Added to your shopping list. Existing entries are kept once.'); }} />
      {!!notice && <Text style={ui.label} accessibilityLiveRegion="polite">{notice}</Text>}
      <PrimaryButton label={`View Shopping List (${state.shopping.length})`} variant="ghost" onPress={() => router.push('/recipe/shopping-list')} />
    </View>
    <View style={ui.card}><Text style={ui.heading}>Cooking Instructions</Text><Text style={ui.text}>{recipe.instructions}</Text></View>
    <PrimaryButton label={cooked ? '✓ Cooked in this demo' : 'I Cooked This'} disabled={cooked || !inventory.available.length} onPress={() => setConfirm(true)} />
    <Modal visible={confirm} transparent animationType="slide" onRequestClose={() => setConfirm(false)}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(19,27,46,0.4)', padding: 16 }}>
        <View style={ui.card}><Text style={ui.title}>Confirm Pantry Ingredients Used</Text>
          <Text style={ui.text}>Mark these complete pantry entries as used only if you finished them:</Text>
          {inventory.available.map((item) => <Text key={item.id} style={ui.text}>{item.name} · {item.quantity} {item.unit}</Text>)}
          <PrimaryButton label="Confirm Cooked" onPress={() => {
            inventory.available.forEach((item) => pantryDispatch({ type: 'status', id: item.id, status: 'CONSUMED' }));
            dispatch({ type: 'cook', id: recipe.id }); setConfirm(false);
          }} />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => setConfirm(false)} />
        </View>
      </View>
    </Modal>
  </PrototypeScreen>;
}
