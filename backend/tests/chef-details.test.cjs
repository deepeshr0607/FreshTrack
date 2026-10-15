const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { AuthFailure } = require('../dist/services/auth.js');
const { createSpoonacularProvider, parseRecipeDetail, RecipeProviderFailure } = require('../dist/integrations/spoonacular.js');
const { createChefSuggestionsService } = require('../dist/services/chefSuggestions.js');
const key = () => 'fixture-api-key-123456';
const identity = { id: 'detail-fixture' };
const verifyIdentity = async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; };
const summary = { id: 123, title: 'Tomato Rice', image: 'https://img.spoonacular.com/recipes/123.jpg', usedIngredientCount: 1,
  missedIngredientCount: 0, usedIngredients: [{ name: 'tomato', original: '1 tomato' }], missedIngredients: [] };
const raw = () => ({ id: 123, title: 'Tomato Rice', image: summary.image, servings: 2, readyInMinutes: 30, preparationMinutes: 10, cookingMinutes: 20,
  sourceName: 'Fixture Kitchen', sourceUrl: 'http://example.test/tomato-rice', creditsText: 'Fixture Author', license: 'CC BY 4.0',
  extendedIngredients: [{ id: 11529, name: 'tomato', original: '2 <b>ripe</b> tomatoes', amount: 2, unit: 'pieces' }],
  analyzedInstructions: [{ name: '', steps: [{ number: 1, step: 'Chop the tomatoes.' }, { number: 2, step: 'Cook &amp; stir.' }] }],
  instructions: '<ol><li>Chop the tomatoes.</li><li>Cook &amp; stir.</li></ol>' });
const response = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const window = { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata', window: 'HOUSEHOLD_TODAY_AND_TOMORROW',
  ingredients: [{ pantryItemId: 'fixture', name: 'tomato', quantity: '2', unit: 'pieces', expiresOn: '2026-10-15' }] };

test('detail parsing preserves real ingredients, servings, times, groups and attribution as display text', () => {
  const result = parseRecipeDetail(raw(), 123);
  assert.equal(result.id, 123); assert.equal(result.servings, 2); assert.equal(result.readyInMinutes, 30);
  assert.equal(result.preparationMinutes, 10); assert.equal(result.cookingMinutes, 20);
  assert.deepEqual(result.ingredients, [{ providerIngredientId: 11529, name: 'tomato', description: '2 ripe tomatoes', amount: 2, unit: 'pieces' }]);
  assert.deepEqual(result.instructionGroups, [{ name: null, steps: [{ number: 1, text: 'Chop the tomatoes.' }, { number: 2, text: 'Cook & stir.' }] }]);
  assert.equal(result.instructions, 'Chop the tomatoes.\nCook & stir.'); assert.equal(result.instructionStatus, 'AVAILABLE');
  assert.deepEqual(result.source, { name: 'Fixture Kitchen', url: 'http://example.test/tomato-rice', credits: 'Fixture Author', license: 'CC BY 4.0' });
  assert.equal(result.providerUrl, 'https://spoonacular.com/recipes/tomato-rice-123');
});
test('missing instructions and unknown fields remain explicit; no fallback directions or servings invented', () => {
  const result = parseRecipeDetail({ ...raw(), analyzedInstructions: [], instructions: null, servings: null, readyInMinutes: undefined,
    preparationMinutes: -1, cookingMinutes: -1, sourceName: null, sourceUrl: '', creditsText: '', license: null }, 123);
  assert.equal(result.instructionStatus, 'UNAVAILABLE'); assert.equal(result.instructions, null); assert.deepEqual(result.instructionGroups, []);
  assert.equal(result.servings, null); assert.equal(result.readyInMinutes, null); assert.equal(result.preparationMinutes, null); assert.equal(result.cookingMinutes, null);
  assert.deepEqual(result.source, { name: null, url: null, credits: null, license: null });
});
test('raw provider instructions remain available when structured steps are absent', () => {
  const result = parseRecipeDetail({ ...raw(), analyzedInstructions: undefined, instructions: '<p>Mix.</p><p>Bake.</p>' }, 123);
  assert.equal(result.instructionStatus, 'AVAILABLE'); assert.deepEqual(result.instructionGroups, []); assert.equal(result.instructions, 'Mix.\nBake.');
});
test('display text decodes entities and removes script/style markup without execution', () => {
  const result = parseRecipeDetail({ ...raw(), analyzedInstructions: [], instructions: '<script>private()</script><style>x{}</style><p>Cook &#38; stir &#x1F372;.</p>' }, 123);
  assert.equal(result.instructions, 'Cook & stir 🍲.');
});
test('malformed/mismatched/oversized detail and unsafe source links fail closed', () => {
  for (const update of [{ id: 999 }, { extendedIngredients: null }, { extendedIngredients: [{ ...raw().extendedIngredients[0], id: -5 }] }, { servings: 0 }, { readyInMinutes: '30' },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:pass@example.test/a' },
    { analyzedInstructions: [{ name: '', steps: [{ number: 1, step: 'Mix' }, { number: 1, step: 'Bake' }] }] },
    { instructions: 'a'.repeat(60001) }, { extendedIngredients: Array(101).fill(raw().extendedIngredients[0]) }]) {
    assert.throws(() => parseRecipeDetail({ ...raw(), ...update }, 123));
  }
});
test('detail transport uses only validated numeric ID and disables optional provider extras', async () => {
  let calls = 0;
  const provider = createSpoonacularProvider({ key, fetch: async (url, options) => {
    calls++; assert.equal(url.origin, 'https://api.spoonacular.com'); assert.equal(url.pathname, '/recipes/123/information');
    assert.deepEqual(Object.fromEntries(url.searchParams), { includeNutrition: 'false', addWinePairing: 'false', addTasteData: 'false' });
    assert.equal(options.headers['x-api-key'], key()); assert.equal(url.href.includes(key()), false); return response(raw());
  } });
  assert.equal((await provider.detail(123)).instructionStatus, 'AVAILABLE');
  for (const id of [0, -1, '123', 1.5, 2147483648, NaN]) await assert.rejects(provider.detail(id), { code: 'RECIPE_NOT_AVAILABLE' });
  assert.equal(calls, 1);
});
test('detail cache is isolated from search cache, clones results and refreshes at five minutes', async () => {
  let clock = 1000, calls = 0;
  const provider = createSpoonacularProvider({ key, now: () => clock, fetch: async url => { calls++; return response(url.pathname.endsWith('information') ? raw() : [summary]); } });
  await provider.search(['tomato']); clock += 1101;
  const first = await provider.detail(123); first.ingredients[0].name = 'mutated';
  assert.equal((await provider.detail(123)).ingredients[0].name, 'tomato'); assert.equal(calls, 2);
  clock += 300001; await provider.detail(123); assert.equal(calls, 3);
});
test('search and detail share process rate protection and quota exhaustion clears detail cache', async () => {
  let clock = 1000, calls = 0;
  const provider = createSpoonacularProvider({ key, now: () => clock, fetch: async url => {
    calls++; return url.pathname.endsWith('information') ? response(raw()) : new Response('private-body', { status: 402 });
  } });
  await provider.detail(123); await assert.rejects(provider.search(['tomato']), { code: 'RECIPE_RATE_LIMITED' });
  clock += 1101; await assert.rejects(provider.search(['tomato']), { code: 'RECIPE_QUOTA_EXHAUSTED' });
  await assert.rejects(provider.detail(123), { code: 'RECIPE_QUOTA_EXHAUSTED' }); assert.equal(calls, 2);
});
test('provider missing recipe and malformed detail failures expose safe codes only', async () => {
  for (const [transport, expected] of [[async () => new Response('private-material', { status: 404 }), 'RECIPE_NOT_AVAILABLE'],
    [async () => response({ ...raw(), id: 999 }), 'RECIPE_UNAVAILABLE'], [async () => new Response('private', { status: 503 }), 'RECIPE_UNAVAILABLE']]) {
    await assert.rejects(createSpoonacularProvider({ key, fetch: transport }).detail(123), error => error.code === expected && !error.message.includes('private'));
  }
});
test('service authorizes details against freshly read account shortlist before provider information calls', async () => {
  let reads = 0, details = 0, offered = true;
  const service = createChefSuggestionsService({ inventory: async user => { assert.equal(user.id, identity.id); reads++; return { ...window, pantryIngredients: window.ingredients }; } },
    { search: async names => { assert.deepEqual(names, ['tomato']); return offered ? [{ id: 123, usedIngredients: [{ name: 'tomato', description: '1 tomato' }], missingIngredients: [] }] : []; }, detail: async id => { details++; return parseRecipeDetail(raw(), id); } });
  assert.equal((await service.detail(identity, 123)).id, 123);
  await assert.rejects(service.detail(identity, 456), { code: 'RECIPE_NOT_AVAILABLE' });
  offered = false; await assert.rejects(service.detail(identity, 123), { code: 'RECIPE_NOT_AVAILABLE' });
  assert.equal(details, 1); assert.equal(reads, 3);
});
test('empty or missing household prevents recipe details regardless of a cached provider ID', async () => {
  let calls = 0;
  const service = createChefSuggestionsService({ inventory: async () => ({ ...window, ingredients: [], pantryIngredients: window.ingredients }) },
    { search: async () => { calls++; return [{ id: 123 }]; }, detail: async () => { calls++; } });
  await assert.rejects(service.detail(identity, 123), { code: 'RECIPE_NOT_AVAILABLE' }); assert.equal(calls, 0);
});
test('detail HTTP endpoint authenticates and validates IDs, queries and bodies before service calls', async () => {
  let calls = 0;
  const service = { detail: async (user, id) => { calls++; assert.equal(user.id, identity.id); assert.equal(id, 123); return parseRecipeDetail(raw(), 123); } };
  assert.equal((await request(createApp({ verifyIdentity, chefSuggestionsService: service })).get('/api/v1/chef/recipes/123')).status, 401);
  for (const path of ['0', '00123', '-1', '1.5', '2147483648', '123?userId=victim']) {
    const app = createApp({ verifyIdentity, chefSuggestionsService: service });
    assert.equal((await request(app).get('/api/v1/chef/recipes/' + path).set('Authorization', 'Bearer a.b.c')).status, 400);
  }
  const app = createApp({ verifyIdentity, chefSuggestionsService: service });
  assert.equal((await request(app).get('/api/v1/chef/recipes/123').set('Authorization', 'Bearer a.b.c').send({ userId: 'victim' })).status, 400);
  assert.equal(calls, 0);
  const res = await request(app).get('/api/v1/chef/recipes/123').set('Authorization', 'Bearer a.b.c').set('x-user-id', 'victim');
  assert.equal(res.status, 200); assert.equal(res.body.data.recipe.id, 123); assert.equal(res.headers['cache-control'], 'no-store'); assert.equal(calls, 1);
});
test('detail and suggestion routes share per-account HTTP quota', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity, chefSuggestionsService: { suggest: async () => { calls++; return {}; }, detail: async () => { calls++; return {}; } } });
  for (let index = 0; index < 3; index++) {
    assert.equal((await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({})).status, 200);
    assert.equal((await request(app).get('/api/v1/chef/recipes/123').set('Authorization', 'Bearer a.b.c')).status, 200);
  }
  const denied = await request(app).get('/api/v1/chef/recipes/123').set('Authorization', 'Bearer a.b.c');
  assert.equal(denied.status, 429); assert.equal(calls, 6);
});
test('unavailable shortlist returns safe 404; timeout retains distinct retryable code', async () => {
  for (const [code, status] of [['RECIPE_NOT_AVAILABLE', 404], ['RECIPE_TIMEOUT', 504]]) {
    const app = createApp({ verifyIdentity, chefSuggestionsService: { detail: async () => { throw new RecipeProviderFailure(code); } } });
    const res = await request(app).get('/api/v1/chef/recipes/123').set('Authorization', 'Bearer a.b.c');
    assert.equal(res.status, status); assert.equal(res.body.error.code, code); assert.equal(res.body.error.requestId, res.headers['x-request-id']);
  }
});
