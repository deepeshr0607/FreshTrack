export const ingredientWindow = { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata', window: 'HOUSEHOLD_TODAY_AND_TOMORROW',
  ingredients: [{ pantryItemId: '11111111-1111-1111-1111-111111111111', name: 'Tomato', quantity: '2', unit: 'pieces', expiresOn: '2026-10-15' }] };
export const matching = { basis: 'SUMMARY', pantryNameMatchPercent: 50, ingredients: [
  { name: 'tomato', canonicalName: 'tomato', description: '2 tomatoes', status: 'PANTRY', pantryItemIds: [ingredientWindow.ingredients[0].pantryItemId], quantityStatus: 'CHECK_AMOUNT' },
  { name: 'rice', canonicalName: 'rice', description: '1 cup rice', status: 'NO_MATCH', pantryItemIds: [], quantityStatus: 'NOT_AVAILABLE' },
], shoppingItems: [{ name: 'rice', reason: 'NO_MATCH', checkFirst: false }] };
export const summary = { id: 123, title: 'Tomato Rice', imageUrl: 'https://img.spoonacular.com/recipes/123.jpg',
  provider: 'spoonacular', providerUrl: 'https://spoonacular.com/recipes/tomato-rice-123',
  usedIngredients: [{ name: 'tomato', description: '2 tomatoes' }], missingIngredients: [{ name: 'rice', description: '1 cup rice' }], match: matching };
export const suggestions = { ...ingredientWindow, state: 'READY', recipes: [summary] };
export const detail = { id: summary.id, title: summary.title, imageUrl: summary.imageUrl, provider: summary.provider, providerUrl: summary.providerUrl,
  servings: 2, readyInMinutes: 30, preparationMinutes: null, cookingMinutes: null,
  ingredients: [{ providerIngredientId: 11529, name: 'tomato', description: '2 tomatoes', amount: 2, unit: 'pieces' }],
  instructionGroups: [{ name: null, steps: [{ number: 1, text: 'Cook the tomatoes.' }] }], instructions: null, instructionStatus: 'AVAILABLE',
  source: { name: 'Fixture', credits: null, license: null, url: 'https://example.test/recipe' }, match: { ...matching, basis: 'FULL_RECIPE' } };
