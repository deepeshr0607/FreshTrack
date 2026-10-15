const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { AuthFailure } = require('../dist/services/auth.js');
const { createSpoonacularProvider, RecipeProviderFailure, recipeSearchNames, parseRecipeSummaries } = require('../dist/integrations/spoonacular.js');
const { createChefSuggestionsService } = require('../dist/services/chefSuggestions.js');
const { ChefFailure } = require('../dist/services/chef.js');
const key = () => 'fixture-api-key-123456';
const ingredient = (name = 'tomato') => ({ name, original: `1 cup ${name}` });
const recipe = (id = 1) => ({ id, title: 'Tomato Rice', image: 'https://img.spoonacular.com/recipes/1.jpg', usedIngredientCount: 1,
  missedIngredientCount: 1, usedIngredients: [ingredient()], missedIngredients: [ingredient('rice')] });
const response = rows => new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } });
const identity = { id: 'chef-suggestion-fixture' };
const verifyIdentity = async value => { if (value !== 'a.b.c') throw new AuthFailure(); return identity; };
const window = { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata', window: 'HOUSEHOLD_TODAY_AND_TOMORROW',
  ingredients: [{ pantryItemId: 'fixture', name: 'Tomato', quantity: '0.5', unit: 'kg', expiresOn: '2026-10-15' }] };

test('provider sends only distinct normalized names, fixed search options and header authentication', async () => {
  const provider = createSpoonacularProvider({ key, fetch: async (url, options) => {
    assert.equal(url.origin, 'https://api.spoonacular.com'); assert.equal(url.pathname, '/recipes/findByIngredients');
    assert.deepEqual(Object.fromEntries(url.searchParams), { ingredients: 'rice,tomato', number: '5', ranking: '1', ignorePantry: 'true' });
    assert.equal(url.href.includes(key()), false); assert.equal(options.headers['x-api-key'], key());
    assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal); return response([recipe()]);
  } });
  const rows = await provider.search([' Tomato ', 'rice', 'tomato']);
  assert.equal(rows[0].providerUrl, 'https://spoonacular.com/recipes/tomato-rice-1');
  assert.deepEqual(rows[0].missingIngredients, [{ name: 'rice', description: '1 cup rice' }]);
  assert.equal('instructions' in rows[0], false);
});
test('empty input never calls provider; missing key and excess or unsafe names fail before transport', async () => {
  let calls = 0; const provider = createSpoonacularProvider({ key: () => '', fetch: async () => { calls++; throw Error(); } });
  assert.deepEqual(await provider.search([]), []); await assert.rejects(provider.search(['tomato']), { code: 'RECIPE_NOT_CONFIGURED' });
  for (const names of [['a,b'], [''], ['a'.repeat(121)], Array.from({ length: 21 }, (_, n) => `item${n}`), Array.from({ length: 20 }, (_, n) => `${n}${'x'.repeat(100)}`)]) {
    assert.throws(() => recipeSearchNames(names), { code: 'RECIPE_INGREDIENT_LIMIT' });
  } assert.equal(calls, 0);
});
test('cache clones results and refreshes after five minutes', async () => {
  let clock = 1000, calls = 0;
  const provider = createSpoonacularProvider({ key, now: () => clock, fetch: async () => { calls++; return response([recipe()]); } });
  (await provider.search(['tomato']))[0].title = 'mutated';
  assert.equal((await provider.search([' TOMATO ']))[0].title, 'Tomato Rice'); assert.equal(calls, 1);
  clock += 300001; await provider.search(['tomato']); assert.equal(calls, 2);
});
test('simultaneous identical requests coalesce; other rapid calls have backpressure', async () => {
  let release, calls = 0;
  const provider = createSpoonacularProvider({ key, fetch: async () => { calls++; await new Promise(resolve => { release = resolve; }); return response([recipe()]); } });
  const one = provider.search(['tomato']), two = provider.search(['tomato']);
  await assert.rejects(provider.search(['rice']), { code: 'RECIPE_RATE_LIMITED' }); release();
  assert.deepEqual(await one, await two); assert.equal(calls, 1);
});
test('daily quota failure blocks new calls until UTC reset without exposing provider bodies', async () => {
  let clock = Date.parse('2026-10-15T23:59:00Z'), calls = 0;
  const provider = createSpoonacularProvider({ key, now: () => clock, fetch: async () => { calls++; return new Response('private-provider-body', { status: 402 }); } });
  await assert.rejects(provider.search(['tomato']), { code: 'RECIPE_QUOTA_EXHAUSTED' });
  clock += 2000; await assert.rejects(provider.search(['rice']), { code: 'RECIPE_QUOTA_EXHAUSTED' }); assert.equal(calls, 1);
  clock = Date.parse('2026-10-16T00:00:01Z'); await assert.rejects(provider.search(['rice']), { code: 'RECIPE_QUOTA_EXHAUSTED' }); assert.equal(calls, 2);
});
test('rejected credentials stop calls; rotation restores access without old cache', async () => {
  let current = key(), calls = 0;
  const provider = createSpoonacularProvider({ key: () => current, fetch: async () => { calls++; return calls === 1 ? new Response('private', { status: 401 }) : response([recipe()]); } });
  await assert.rejects(provider.search(['tomato']), { code: 'RECIPE_NOT_CONFIGURED' });
  await assert.rejects(provider.search(['rice']), { code: 'RECIPE_NOT_CONFIGURED' }); assert.equal(calls, 1);
  current = 'rotated-fixture-key-123456'; assert.equal((await provider.search(['tomato'])).length, 1); assert.equal(calls, 2);
});
test('rate-limit, transport, non-JSON, malformed, oversized and schema failures are redacted', async () => {
  for (const [transport, code] of [
    [async () => new Response('private', { status: 429 }), 'RECIPE_RATE_LIMITED'],
    [async () => new Response('private', { status: 500 }), 'RECIPE_UNAVAILABLE'],
    [async () => { throw Error('private-url-token-material'); }, 'RECIPE_UNAVAILABLE'],
    [async () => new Response('<html>bad</html>', { headers: { 'content-type': 'text/html' } }), 'RECIPE_UNAVAILABLE'],
    [async () => new Response('{bad', { headers: { 'content-type': 'application/json' } }), 'RECIPE_UNAVAILABLE'],
    [async () => new Response('x'.repeat(512001), { headers: { 'content-type': 'application/json' } }), 'RECIPE_UNAVAILABLE'],
    [async () => response([{ ...recipe(), missedIngredientCount: 2 }]), 'RECIPE_UNAVAILABLE']]) {
    await assert.rejects(createSpoonacularProvider({ key, fetch: transport }).search(['tomato']), error => error.code === code && !error.message.includes('private'));
  }
});
test('schema validation and ranking require real used ingredients and safe images/text', () => {
  const more = { ...recipe(9), usedIngredients: [ingredient(), ingredient('onion')], usedIngredientCount: 2 };
  const fewer = { ...recipe(8), missedIngredients: [], missedIngredientCount: 0 };
  const unused = { ...recipe(7), usedIngredients: [], usedIngredientCount: 0 };
  assert.deepEqual(parseRecipeSummaries([recipe(3), more, recipe(2), fewer, unused]).map(row => row.id), [9, 8, 2, 3]);
  for (const rows of [[recipe(), recipe()], [{ ...recipe(), image: 'http://evil.test/private' }], [{ ...recipe(), title: '<script>bad</script>' }]]) assert.throws(() => parseRecipeSummaries(rows));
});
test('each suggestion request reads current scoped ingredients; an empty window skips provider calls', async () => {
  let reads = 0, searches = 0;
  const service = createChefSuggestionsService({ inventory: async user => { reads++; assert.equal(user.id, identity.id); return { ...(reads === 1 ? window : { ...window, ingredients: [] }), pantryIngredients: window.ingredients }; } },
    { search: async names => { searches++; assert.deepEqual(names, ['Tomato']); return []; } });
  assert.equal((await service.suggest(identity)).state, 'NO_RESULTS'); assert.equal((await service.suggest(identity)).state, 'NO_NEAR_EXPIRY'); assert.equal(searches, 1);
});
test('HTTP authentication and empty-body validation reject client identity/ingredient overrides', async () => {
  let calls = 0; const app = createApp({ verifyIdentity, chefSuggestionsService: { suggest: async user => { calls++; assert.equal(user.id, identity.id); return { ...window, recipes: [], state: 'NO_RESULTS' }; } } });
  assert.equal((await request(app).post('/api/v1/chef/suggestions').send({})).status, 401);
  for (const body of [{ userId: 'victim' }, { ingredients: ['rice'] }, [], { householdId: 'victim' }]) assert.equal((await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send(body)).status, 400);
  assert.equal((await request(app).post('/api/v1/chef/suggestions?diet=vegan').set('Authorization', 'Bearer a.b.c').send({})).status, 400); assert.equal(calls, 0);
  const result = await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({});
  assert.equal(result.status, 200); assert.equal(result.headers['cache-control'], 'no-store'); assert.equal(calls, 1);
});
test('account rate limiting prevents a seventh request from accessing the service', async () => {
  let calls = 0; const app = createApp({ verifyIdentity, chefSuggestionsService: { suggest: async () => { calls++; return { recipes: [] }; } } });
  for (let index = 0; index < 6; index++) assert.equal((await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({})).status, 200);
  const denied = await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({});
  assert.equal(denied.status, 429); assert.equal(denied.body.error.code, 'RECIPE_RATE_LIMITED'); assert.equal(calls, 6);
});
test('provider and household errors return consistent envelopes with safe request IDs', async () => {
  for (const [error, status] of [[new RecipeProviderFailure('RECIPE_QUOTA_EXHAUSTED'), 503], [new RecipeProviderFailure('RECIPE_TIMEOUT'), 504],
    [new RecipeProviderFailure('RECIPE_NOT_CONFIGURED'), 503], [new RecipeProviderFailure('RECIPE_RATE_LIMITED'), 429], [new ChefFailure('HOUSEHOLD_REQUIRED'), 409]]) {
    const app = createApp({ verifyIdentity, chefSuggestionsService: { suggest: async () => { throw error; } } });
    const result = await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({});
    assert.equal(result.status, status); assert.equal(result.body.error.code, error.code); assert.equal(result.body.error.requestId, result.headers['x-request-id']);
  }
});
