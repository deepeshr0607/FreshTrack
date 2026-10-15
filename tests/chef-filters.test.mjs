import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChefApi } from '../lib/chefApi.ts';
import { createChefSession } from '../lib/chefSession.ts';
import { filterChefRecipes } from '../lib/chefRecipes.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';
import { suggestions, ingredientWindow, detail } from './chef-fixtures.mjs';
const tagged = (id, minutes, vegetarian, vegan) => ({ ...suggestions.recipes[0], id, metadata: { id, readyInMinutes: minutes, vegetarian, vegan } });
const rows = [tagged(1, 15, true, true), tagged(2, 16, true, false), tagged(3, null, null, null), { ...suggestions.recipes[0], id: 4 }];
const io = () => ({ ingredients: async () => ingredientWindow, suggest: async () => suggestions, detail: async () => detail,
  filters: async () => ({ ...suggestions, recipes: rows.slice(0, 3) }) });
test('Quick and preferences compose with search/save filters and exclude unknown provider values', () => {
  assert.deepEqual(filterChefRecipes(rows, '', 'Quick', []).map(row => row.id), [1]);
  assert.deepEqual(filterChefRecipes(rows, '', 'All Recipes', [], 'Vegetarian').map(row => row.id), [1, 2]);
  assert.deepEqual(filterChefRecipes(rows, '', 'Quick', [], 'Vegan').map(row => row.id), [1]);
  assert.deepEqual(filterChefRecipes(rows, '', 'Saved', [2], 'Vegetarian').map(row => row.id), [2]);
  assert.equal(filterChefRecipes(rows, 'no-such-dish', 'Quick', [], 'Vegan').length, 0);
  assert.equal(filterChefRecipes(rows, '', 'All Recipes', [], 'Any').length, 4);
});
test('filter API posts no IDs/preferences and validates nullable provider metadata', async () => {
  const api = createChefApi('https://backend.example.test', async () => 'jwt', false, async (url, options) => {
    assert.equal(url, 'https://backend.example.test/api/v1/chef/filters'); assert.equal(options.body, '{}');
    return Response.json({ data: { ...suggestions, recipes: rows.slice(0, 3) } });
  });
  assert.equal((await api.filters()).recipes.length, 3);
  for (const recipes of [[tagged(1, 15, 'true', false)], [{ ...rows[0], metadata: { ...rows[0].metadata, id: 999 } }], [suggestions.recipes[0]]]) {
    const malformed = createChefApi('https://backend.example.test', async () => 'jwt', false, async () => Response.json({ data: { ...suggestions, recipes } }));
    await assert.rejects(malformed.filters(), { code: 'CHEF_RESPONSE' });
  }
});
test('filter errors preserve original suggestions and shopping, and retry can recover metadata', async () => {
  let fail = true; const api = io(); api.filters = async () => { if (fail) throw new NeonAuthError('RECIPE_RATE_LIMITED', 'Wait then retry.'); return { ...suggestions, recipes: rows.slice(0, 3) }; };
  const store = createChefSession(api, () => true); await store.suggest(); store.addShopping(['rice']); await store.loadFilters();
  assert.equal(store.getSnapshot().filtersStatus, 'error'); assert.equal(store.getSnapshot().suggestions.recipes[0].id, 123);
  assert.equal(store.getSnapshot().shopping.length, 1); fail = false; await store.loadFilters();
  assert.equal(store.getSnapshot().filtersStatus, 'ready'); assert.equal(store.getSnapshot().suggestions.recipes[0].metadata.readyInMinutes, 15); store.dispose();
});
test('double metadata submit coalesces and late responses cannot cross refresh/auth invalidation', async () => {
  let release, calls = 0; const api = io(); api.filters = async () => { calls++; return await new Promise(resolve => { release = resolve; }); };
  const store = createChefSession(api, () => true); await store.suggest(); const pending = store.loadFilters(); await store.loadFilters(); assert.equal(calls, 1);
  store.invalidate(); release({ ...suggestions, recipes: rows.slice(0, 3) }); await pending;
  assert.equal(store.getSnapshot().suggestions, null); assert.equal(store.getSnapshot().filtersStatus, 'idle'); store.dispose();
});
