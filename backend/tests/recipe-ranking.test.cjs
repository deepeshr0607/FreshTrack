const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { rankChefRecipes } = require('../dist/lib/recipeRanking.js');
const { createSpoonacularProvider, parseRecipeMetadata, RecipeProviderFailure } = require('../dist/integrations/spoonacular.js');
const { createChefSuggestionsService } = require('../dist/services/chefSuggestions.js');
const { createApp } = require('../dist/app.js');
const { AuthFailure } = require('../dist/services/auth.js');
const window = { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata', window: 'HOUSEHOLD_TODAY_AND_TOMORROW',
  ingredients: [{ pantryItemId: 'one', name: 'tomatoes', quantity: '1', unit: 'pieces', expiresOn: '2026-10-15' },
    { pantryItemId: 'two', name: 'milk', quantity: '1', unit: 'l', expiresOn: '2026-10-16' }] };
const row = (id, names = ['tomato'], coverage = 50, missing = 1, minutes = null) => ({ id, title: 'Fixture', usedIngredients: names.map(name => ({ name, description: name })), missingIngredients: [],
  match: { pantryNameMatchPercent: coverage, shoppingItems: Array(missing).fill({ name: 'rice' }) }, metadata: { id, readyInMinutes: minutes, vegetarian: true, vegan: null } });
test('ranking uses unique rescue urgency before coverage, missing count, known time and stable ID', () => {
  const rows = [row(8, ['milk'], 100, 0, 5), row(7, ['tomato', 'tomatoes'], 50, 1, 20), row(6, ['tomato', 'milk'], 10, 5, 90)];
  const result = rankChefRecipes(rows, window);
  assert.deepEqual(result.map(row => row.id), [6, 7, 8]); assert.equal(result[1].rescuePriority, 2); assert.equal(result[1].rescueIngredientCount, 1);
  assert.equal(rows[0].rescuePriority, undefined);
  assert.deepEqual(rankChefRecipes([row(5, ['tomato'], 80, 1, null), row(4, ['tomato'], 80, 1, 15), row(3, ['tomato'], 80, 0, 30), row(2, ['tomato'], 90, 3, 90)], window).map(row => row.id), [2, 3, 4, 5]);
  assert.deepEqual(rankChefRecipes([row(2), row(1)], window).map(row => row.id), [1, 2]);
});
test('metadata preserves tri-state tags and missing/zero time without inferring labels from names', () => {
  assert.deepEqual(parseRecipeMetadata([{ id: 1, readyInMinutes: 15, vegetarian: true, vegan: false }, { id: 2, readyInMinutes: 0 }], [1, 2]),
    [{ id: 1, readyInMinutes: 15, vegetarian: true, vegan: false }, { id: 2, readyInMinutes: null, vegetarian: null, vegan: null }]);
  for (const value of [[{ id: 1, vegetarian: 'true' }], [{ id: 2 }], [], [{ id: 1, readyInMinutes: '15' }], [{ id: 1, readyInMinutes: 15 }, { id: 1 }]]) {
    assert.throws(() => parseRecipeMetadata(value, [1]));
  }
});
test('metadata transport requests only bounded selected IDs, uses header auth and shares its short cache', async () => {
  let calls = 0;
  const provider = createSpoonacularProvider({ key: () => 'fixture-api-key-123456', fetch: async (url, options) => {
    calls++; assert.equal(url.pathname, '/recipes/informationBulk'); assert.deepEqual(Object.fromEntries(url.searchParams), { ids: '1,2', includeNutrition: 'false' });
    assert.equal(options.headers['x-api-key'], 'fixture-api-key-123456'); assert.equal(url.href.includes('fixture-api-key'), false);
    return Response.json([{ id: 1, readyInMinutes: 15, vegetarian: true }, { id: 2, readyInMinutes: null, vegetarian: false }]);
  } });
  const rows = await provider.metadata([2, 1]); rows[0].vegetarian = false;
  assert.equal((await provider.metadata([1, 2]))[0].vegetarian, true); assert.equal(calls, 1);
  assert.deepEqual(await provider.metadata([]), []);
  for (const ids of [[1, 1], [1, 2, 3, 4, 5, 6], [-1]]) await assert.rejects(provider.metadata(ids), { code: 'RECIPE_NOT_AVAILABLE' });
  assert.equal(calls, 1);
});
test('ordinary suggestions fetch no metadata; filter action derives IDs from the current server shortlist', async () => {
  let reads = 0, calls = 0;
  const service = createChefSuggestionsService({ inventory: async user => { reads++; assert.equal(user.id, 'own-account'); return { ...window, pantryIngredients: window.ingredients }; } },
    { search: async names => { assert.deepEqual(names, ['tomatoes', 'milk']); return [{ ...row(123), match: undefined }]; }, metadata: async ids => { calls++; assert.deepEqual(ids, [123]); return [{ id: 123, readyInMinutes: 15, vegetarian: true, vegan: false }]; } });
  assert.equal((await service.suggest({ id: 'own-account' })).recipes.length, 1); assert.equal(calls, 0);
  const filtered = await service.filters({ id: 'own-account' }); assert.equal(filtered.recipes[0].metadata.readyInMinutes, 15); assert.equal(reads, 2); assert.equal(calls, 1);
});
test('empty rescue windows skip both provider calls and metadata failures retain safe error codes', async () => {
  let calls = 0;
  const empty = createChefSuggestionsService({ inventory: async () => ({ ...window, ingredients: [], pantryIngredients: [] }) }, { search: async () => { calls++; }, metadata: async () => { calls++; } });
  assert.equal((await empty.filters({ id: 'own' })).state, 'NO_NEAR_EXPIRY'); assert.equal(calls, 0);
  const failed = createChefSuggestionsService({ inventory: async () => ({ ...window, pantryIngredients: window.ingredients }) },
    { search: async () => [row(123)], metadata: async () => { throw new RecipeProviderFailure('RECIPE_QUOTA_EXHAUSTED'); } });
  await assert.rejects(failed.filters({ id: 'own' }), { code: 'RECIPE_QUOTA_EXHAUSTED' });
});
test('metadata HTTP boundary authenticates and rejects all user-selected IDs or preference overrides', async () => {
  let calls = 0; const verifyIdentity = async token => { if (token !== 'a.b.c') throw new AuthFailure(); return { id: 'own-account' }; };
  const service = { filters: async user => { calls++; assert.equal(user.id, 'own-account'); return { ...window, recipes: [], state: 'NO_RESULTS' }; } };
  const app = createApp({ verifyIdentity, chefSuggestionsService: service });
  assert.equal((await request(app).post('/api/v1/chef/filters').send({})).status, 401);
  for (const body of [{ ids: [123] }, { userId: 'victim' }, { diet: 'vegan' }, []]) assert.equal((await request(app).post('/api/v1/chef/filters').set('Authorization', 'Bearer a.b.c').send(body)).status, 400);
  assert.equal(calls, 0);
  const res = await request(app).post('/api/v1/chef/filters').set('Authorization', 'Bearer a.b.c').send({});
  assert.equal(res.status, 200); assert.equal(res.headers['cache-control'], 'no-store'); assert.equal(calls, 1);
});
