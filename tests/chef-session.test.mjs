import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChefSession } from '../lib/chefSession.ts';
import { filterChefRecipes, matchingLabel } from '../lib/chefRecipes.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';
import { ingredientWindow, suggestions, detail, matching } from './chef-fixtures.mjs';
const api = () => ({ ingredients: async () => ingredientWindow, suggest: async () => suggestions, detail: async () => detail });
test('reading ingredients makes no provider suggestion request; suggestions/details are explicit and typed', async () => {
  let searches = 0; const io = api(); io.suggest = async () => { searches++; return suggestions; };
  const store = createChefSession(io, () => true); await store.loadIngredients(); assert.equal(searches, 0);
  assert.equal(store.getSnapshot().ingredientsStatus, 'ready'); await store.suggest(); await store.loadDetail('123');
  assert.equal(searches, 1); assert.equal(store.getSnapshot().recipe.id, 123); store.dispose();
});
test('double Suggest coalesces UI submits and unavailable/empty results do not show stale fixtures', async () => {
  let release, calls = 0; const io = api(); io.suggest = async () => { calls++; return await new Promise(resolve => { release = resolve; }); };
  const store = createChefSession(io, () => true); const first = store.suggest(); await store.suggest(); assert.equal(calls, 1);
  release({ ...suggestions, state: 'NO_RESULTS', recipes: [] }); await first;
  assert.deepEqual(store.getSnapshot().suggestions.recipes, []); assert.equal(store.getSnapshot().suggestionsStatus, 'ready'); store.dispose();
});
test('stale suggestion completion cannot replace refreshed Pantry or publish after session invalidation', async () => {
  let release; const io = api(); io.suggest = async () => await new Promise(resolve => { release = resolve; });
  let active = true; const store = createChefSession(io, () => active); const request = store.suggest();
  active = false; store.invalidate(); release(suggestions); await request;
  assert.equal(store.getSnapshot().suggestions, null); assert.equal(store.getSnapshot().suggestionsStatus, 'idle');
  active = true; await store.loadIngredients(); assert.equal(store.getSnapshot().ingredientsStatus, 'ready'); store.dispose();
});
test('latest recipe wins and request errors clear the old recipe with a specific retry message', async () => {
  const pending = new Map(); const io = api(); io.detail = async id => await new Promise(resolve => pending.set(id, resolve));
  const store = createChefSession(io, () => true); const first = store.loadDetail('123'), second = store.loadDetail('456');
  pending.get('456')({ ...detail, id: 456 }); await second; pending.get('123')(detail); await first;
  assert.equal(store.getSnapshot().recipe.id, 456); store.dispose();
  const broken = api(); broken.detail = async () => { throw new NeonAuthError('RECIPE_NOT_AVAILABLE', 'Refresh your suggestions.'); };
  const failed = createChefSession(broken, () => true); await failed.loadDetail('123');
  assert.equal(failed.getSnapshot().detailStatus, 'error'); assert.equal(failed.getSnapshot().recipe, null);
  assert.match(failed.getSnapshot().detailError, /RECIPE_NOT_AVAILABLE/); failed.dispose();
});
test('shopping is name-deduplicated, retains checked rows on re-add and clears only purchased items', () => {
  const store = createChefSession(api(), () => true); store.addShopping([' Rice ', 'rice', 'salt']); store.toggleShopping('rice'); store.addShopping(['RICE']);
  assert.deepEqual(store.getSnapshot().shopping, [{ name: 'rice', checked: true }, { name: 'salt', checked: false }]);
  store.clearPurchased(); assert.deepEqual(store.getSnapshot().shopping, [{ name: 'salt', checked: false }]); store.dispose();
});
test('account stores and Demo data stay separate; sign-out disposal clears shopping and saved IDs', async () => {
  const one = createChefSession(api(), () => true), two = createChefSession(api(), () => true);
  one.addShopping(['rice']); one.save(123); assert.deepEqual(two.getSnapshot().shopping, []); assert.deepEqual(two.getSnapshot().saved, []);
  one.invalidate(); assert.equal(one.getSnapshot().shopping.length, 1); // Verified same-account resume can keep user intent.
  one.dispose(); assert.deepEqual(one.getSnapshot().shopping, []); assert.deepEqual(one.getSnapshot().saved, []);
  const demo = createChefSession({ ingredients: async () => assert.fail(), suggest: async () => assert.fail(), detail: async () => assert.fail() }, () => false);
  await demo.suggest(); await demo.loadIngredients(); demo.addShopping(['secret']); assert.deepEqual(demo.getSnapshot().shopping, []);
  two.dispose(); demo.dispose();
});
test('shopping capacity failures are atomic and unknown request failures are redacted', async () => {
  const io = api(); io.suggest = async () => { throw Error('private-token'); }; const store = createChefSession(io, () => true);
  store.addShopping(Array.from({ length: 200 }, (_, n) => `item ${n}`)); assert.throws(() => store.addShopping(['extra']), { code: 'CHEF_SHOPPING_LIMIT' });
  assert.equal(store.getSnapshot().shopping.length, 200); await store.suggest(); assert.equal(store.getSnapshot().suggestionsStatus, 'error');
  assert.equal(store.getSnapshot().suggestionsError.includes('private'), false); store.dispose();
});
test('real recipe filtering and review labels never turn a name match into quantity or staple certainty', () => {
  const rows = [suggestions.recipes[0], { ...suggestions.recipes[0], id: 456, title: 'Other Dish', match: { ...matching, pantryNameMatchPercent: 90, ingredients: [{ ...matching.ingredients[0], name: 'spinach' }] } }];
  assert.equal(filterChefRecipes(rows, ' ToMaTo   RiCe ', 'All Recipes', []).length, 1);
  assert.deepEqual(filterChefRecipes(rows, '', 'High Match', []).map(row => row.id), [456]);
  assert.deepEqual(filterChefRecipes(rows, '', 'Saved', [123]).map(row => row.id), [123]);
  assert.match(matchingLabel(matching.ingredients[0]), /check amount/);
  assert.match(matchingLabel({ ...matching.ingredients[0], status: 'CHECK_STAPLE' }), /Check your kitchen/);
});
