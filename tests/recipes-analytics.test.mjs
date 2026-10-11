import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recipeInventory, recipeReducer, filterRecipes } from '../lib/recipes.ts';
import { sessionOutcomes, impactReport } from '../lib/analytics.ts';
import { MOCK_EFFICIENCY, MOCK_INSIGHT_PERIODS, MOCK_RECIPES, MOCK_SAVED_CATEGORIES } from '../lib/mock.ts';

test('shopping list deduplicates across recipes and casing without losing checked state', () => {
  let state = { shopping: [], saved: [], cooked: [] };
  state = recipeReducer(state, { type: 'add', ingredients: ['Milk', ' Bread ', 'milk', ''] });
  assert.equal(state.shopping.length, 2);
  state = recipeReducer(state, { type: 'toggle', name: 'Milk' });
  state = recipeReducer(state, { type: 'add', ingredients: ['MILK', 'Eggs'] });
  assert.deepEqual(state.shopping, [{ name: 'Milk', checked: true }, { name: 'Bread', checked: false }, { name: 'Eggs', checked: false }]);
  state = recipeReducer(state, { type: 'clear-checked' });
  assert.deepEqual(state.shopping.map((entry) => entry.name), ['Bread', 'Eggs']);
});

test('recipe availability uses stable pantry IDs after edits and excludes consumed entries', () => {
  const recipe = MOCK_RECIPES[0];
  const result = recipeInventory(recipe, [{ id: 'p1', name: 'Renamed spinach', status: 'ACTIVE' },
    { id: 'p3', name: 'Milk', status: 'CONSUMED' }]);
  assert.equal(result.available[0].name, 'Renamed spinach');
  assert.ok(result.missing.includes('Milk'));
  assert.ok(result.missing.includes('Rigatoni pasta'));
});

test('cooking is idempotent and save toggles independently', () => {
  const empty = { shopping: [], saved: [], cooked: [] };
  const cooked = recipeReducer(empty, { type: 'cook', id: 'r1' });
  assert.equal(recipeReducer(cooked, { type: 'cook', id: 'r1' }), cooked);
  const saved = recipeReducer(cooked, { type: 'save', id: 'r1' });
  assert.deepEqual(recipeReducer(saved, { type: 'save', id: 'r1' }).saved, []);
});

test('query, quick, high-match and saved filters compose and no matches return empty', () => {
  assert.ok(filterRecipes(MOCK_RECIPES, 'spinach', 'Quick', []).every((recipe) => recipe.prepMinutes <= 15));
  assert.equal(filterRecipes(MOCK_RECIPES, '', 'Saved', ['r3'])[0].id, 'r3');
  assert.ok(filterRecipes(MOCK_RECIPES, '', 'High Match', []).every((recipe) => recipe.matchPercent >= 90));
  assert.deepEqual(filterRecipes(MOCK_RECIPES, 'nonexistent ingredient', 'All Recipes', []), []);
});

test('session outcomes ignore active and assumed entries and preserve separate monetary totals', () => {
  const result = sessionOutcomes([{ price: 3.99, status: 'CONSUMED' }, { price: 4.29, status: 'WASTED' },
    { price: 100, status: 'ACTIVE' }, { price: 100, status: 'ASSUMED_CONSUMED' }]);
  assert.deepEqual(result, { saved: 3.99, wasted: 4.29, usedItems: 1, wastedItems: 1 });
  assert.match(impactReport('This Month', result.saved, 42.8, 19.2), /Rescued value: \$3\.99/);
});

test('monthly category and weekly masses agree with the Insights totals', () => {
  const summary = MOCK_INSIGHT_PERIODS['This Month'];
  const close = (value, expected) => assert.ok(Math.abs(value - expected) < 0.000001);
  close(MOCK_SAVED_CATEGORIES.reduce((sum, entry) => sum + entry.value, 0), summary.saved);
  close(MOCK_SAVED_CATEGORIES.reduce((sum, entry) => sum + entry.kg, 0), summary.rescuedKg);
  close(MOCK_EFFICIENCY.reduce((sum, entry) => sum + entry.rescued, 0), summary.rescuedKg);
  close(MOCK_EFFICIENCY.reduce((sum, entry) => sum + entry.wasted, 0), summary.wasteKg);
});
