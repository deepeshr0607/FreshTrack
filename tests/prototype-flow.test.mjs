import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { MOCK_PANTRY_ITEMS, MOCK_RECIPES, MOCK_INSIGHT_PERIODS } from '../lib/mock.ts';
import { pantryReducer } from '../lib/pantry.ts';
import { recipeInventory, recipeReducer } from '../lib/recipes.ts';
import { sessionOutcomes, impactReport } from '../lib/analytics.ts';

// Expo resolves extensionless imports; Node's strip-types runner needs this narrow mapping.
registerHooks({ resolve(specifier, context, nextResolve) {
  const scannerModule = /\/lib\/(receipt|barcode)\.ts$/.test(context.parentURL ?? '');
  return nextResolve(specifier === './pantry' && scannerModule ? './pantry.ts' : specifier, context);
} });
const { newReceiptCandidates, prepareReceiptImport } = await import('../lib/receipt.ts');
const { MOCK_BARCODE_PRODUCTS, newBarcodeCandidate, prepareBarcodeImport } = await import('../lib/barcode.ts');

test('scanner purchases, shopping, cooking and reconciliation preserve identity and report each outcome once', () => {
  let pantry = MOCK_PANTRY_ITEMS;
  const originals = structuredClone(pantry);
  let recipes = { shopping: [], saved: [], cooked: [] };
  const recipe = MOCK_RECIPES.find((entry) => entry.id === 'r1');

  const receipt = newReceiptCandidates(new Date(2026, 9, 11));
  assert.match(prepareReceiptImport(receipt, pantry, 'haul').error, /Choose Skip/);
  receipt[0].duplicateChoice = 'skip';
  receipt[1].draft.expiresOn = '2000-01-01';
  const haul = prepareReceiptImport(receipt, pantry, 'haul');
  assert.equal(haul.error, null);
  assert.equal(haul.items.length, 3);
  pantry = pantryReducer(pantry, { type: 'receipt', items: haul.items });
  assert.strictEqual(pantryReducer(pantry, { type: 'receipt', items: haul.items }), pantry);

  const packaged = newBarcodeCandidate(MOCK_BARCODE_PRODUCTS[1], 'chips');
  packaged.draft.expiresOn = '2026-12-31';
  packaged.confirmed = true;
  packaged.expirySource = 'USER_ENTERED';
  assert.match(prepareBarcodeImport([packaged], pantry, 'scan').error, /Choose Skip/);
  packaged.duplicateChoice = 'separate';
  const scan = prepareBarcodeImport([packaged], pantry, 'scan');
  assert.equal(scan.error, null);
  pantry = pantryReducer(pantry, { type: 'barcode', items: scan.items });
  assert.equal(pantry.find((entry) => entry.id === 'p8').status, 'ACTIVE');
  assert.strictEqual(pantryReducer(pantry, { type: 'barcode', items: scan.items }), pantry);

  // Reviewed duplicate purchases retain separate identities and do not replace recipe ingredients.
  const inventory = recipeInventory(recipe, pantry);
  assert.deepEqual(inventory.available.map((entry) => entry.id), recipe.pantryIds);
  recipes = recipeReducer(recipes, { type: 'add', ingredients: inventory.missing });
  recipes = recipeReducer(recipes, { type: 'toggle', name: inventory.missing[0] });
  recipes = recipeReducer(recipes, { type: 'add', ingredients: inventory.missing });
  assert.equal(recipes.shopping.length, 2);
  assert.equal(recipes.shopping[0].checked, true);
  recipes = recipeReducer(recipes, { type: 'clear-checked' });
  assert.deepEqual(recipes.shopping.map((entry) => entry.name), ['Ricotta cheese']);
  assert.deepEqual(sessionOutcomes(pantry), { saved: 0, wasted: 0, usedItems: 0, wastedItems: 0 });

  for (const entry of inventory.available) {
    pantry = pantryReducer(pantry, { type: 'status', id: entry.id, status: 'CONSUMED' });
  }
  recipes = recipeReducer(recipes, { type: 'cook', id: recipe.id });
  assert.strictEqual(recipeReducer(recipes, { type: 'cook', id: recipe.id }), recipes);
  assert.equal(recipeInventory(recipe, pantry).available.length, 0);

  const overdue = pantry.filter((entry) => entry.status === 'ACTIVE' && entry.daysLeft < 0);
  assert.equal(overdue.length, 1);
  const wastedIds = [overdue[0].id, scan.items[0].id];
  pantry = pantryReducer(pantry, { type: 'batch-status', ids: wastedIds, status: 'WASTED' });
  assert.strictEqual(pantryReducer(pantry, { type: 'batch-status', ids: wastedIds, status: 'WASTED' }), pantry);
  assert.equal(pantry.filter((entry) => entry.status === 'ACTIVE' && entry.daysLeft < 0).length, 0);
  const outcomes = sessionOutcomes(pantry);
  assert.equal(outcomes.saved.toFixed(2), '8.48');
  assert.equal(outcomes.wasted.toFixed(2), '8.28');
  assert.equal(outcomes.usedItems, 2);
  assert.equal(outcomes.wastedItems, 2);
  assert.equal(pantry.filter((entry) => entry.status === 'ACTIVE').length, 8);
  assert.match(impactReport('This Month', MOCK_INSIGHT_PERIODS['This Month'].saved + outcomes.saved, 42.8, 19.2), /Rescued value: \$92\.98/);
  assert.deepEqual(MOCK_PANTRY_ITEMS, originals);
});
