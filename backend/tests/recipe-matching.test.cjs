const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canonicalIngredient, matchRecipeIngredients, matchRecipeSummary, matchRecipeDetail } = require('../dist/lib/recipeMatching.js');
const { createChefService } = require('../dist/services/chef.js');
const { createChefSuggestionsService } = require('../dist/services/chefSuggestions.js');
const required = (name, amount = null, unit = '') => ({ name, description: `Recipe ${name}`, amount, unit });
const stock = (name, quantity = '1', unit = 'pieces', id = name) => ({ pantryItemId: id, name, quantity, unit, expiresOn: '2026-10-20' });
const match = (rows, pantry) => matchRecipeIngredients(rows, pantry, 'FULL_RECIPE');

test('matching normalizes exact names and curated aliases but never guesses brands or variants', () => {
  assert.equal(canonicalIngredient('  ToMaToEs  '), 'tomato');
  assert.equal(canonicalIngredient('coriander   leaves'), 'cilantro'); assert.equal(canonicalIngredient('brinjal'), 'eggplant');
  const result = match([required('tomatoes'), required('milk'), required('brown rice'), required('red onion')],
    [stock('Tomato'), stock('Low-fat milk'), stock('rice'), stock('onion')]);
  assert.deepEqual(result.ingredients.map(row => row.status), ['PANTRY', 'NO_MATCH', 'NO_MATCH', 'NO_MATCH']);
  assert.equal(result.pantryNameMatchPercent, 25);
  assert.equal(match([required('flour')], [stock('plain flour')]).ingredients[0].status, 'NO_MATCH');
});
test('staples are explicit check-first candidates, never silently counted as available', () => {
  const result = match([required('salt'), required('water'), required('olive oil'), required('rice')], []);
  assert.deepEqual(result.ingredients.map(row => row.status), ['CHECK_STAPLE', 'CHECK_STAPLE', 'CHECK_STAPLE', 'NO_MATCH']);
  assert.equal(result.pantryNameMatchPercent, 0);
  assert.equal(result.shoppingItems[0].checkFirst, true);
  assert.equal(result.shoppingItems[3].checkFirst, false);
  assert.equal(match([required('salt')], [stock('salt', '100', 'g')]).ingredients[0].status, 'PANTRY');
});
test('quantities combine separate purchases and compatible metric units using exact decimal arithmetic', () => {
  const result = match([required('tomatoes', 0.3, 'kg'), required('milk', 500, 'ml')],
    [stock('Tomato', '100', 'g', 'one'), stock('Tomatoes', '0.2', 'kg', 'two'), stock('Milk', '0.5', 'l')]);
  assert.deepEqual(result.ingredients.map(row => row.quantityStatus), ['SUFFICIENT', 'SUFFICIENT']);
  assert.deepEqual(result.ingredients[0].pantryItemIds, ['one', 'two']);
  assert.deepEqual(result.shoppingItems, []);
});
test('known shortfalls are shopping candidates without invented missing amounts', () => {
  const result = match([required('milk', 0.501, 'l')], [stock('milk', '500', 'ml')]);
  assert.equal(result.ingredients[0].quantityStatus, 'INSUFFICIENT');
  assert.deepEqual(result.shoppingItems, [{ name: 'milk', reason: 'INSUFFICIENT', checkFirst: false }]);
  assert.equal('amount' in result.shoppingItems[0], false);
});
test('unknown units, missing amounts, high precision and mixed dimensions require review', () => {
  for (const [row, pantry] of [
    [required('rice', 1, 'cup'), [stock('rice', '1', 'kg')]],
    [required('rice'), [stock('rice', '1', 'kg')]],
    [required('milk', 1, 'l'), [stock('milk', '1', 'kg')]],
    [required('rice', 0.3333333333333, 'kg'), [stock('rice', '1', 'kg')]],
    [required('rice', 2, 'kg'), [stock('rice', '1', 'kg', 'known'), stock('rice', '1', 'bag', 'unknown')]],
    [required('tomato', 0, 'pieces'), [stock('tomato')]],
  ]) assert.equal(match([row], pantry).ingredients[0].quantityStatus, 'CHECK_AMOUNT');
});
test('repeated recipe components share total demand instead of reusing the same supply twice', () => {
  const result = match([required('sugar', 100, 'g'), required('sugar', 0.1, 'kg')], [stock('sugar', '150', 'g')]);
  assert.deepEqual(result.ingredients.map(row => row.quantityStatus), ['INSUFFICIENT', 'INSUFFICIENT']);
  assert.equal(result.shoppingItems.length, 1);
  const uncertain = match([required('sugar', 100, 'g'), required('sugar', 1, 'cup')], [stock('sugar', '1', 'kg')]);
  assert.deepEqual(uncertain.ingredients.map(row => row.quantityStatus), ['CHECK_AMOUNT', 'CHECK_AMOUNT']);
});
test('summary and full recipe use identical name/staple rules; summary cannot claim quantity sufficiency', () => {
  const pantry = [stock('tomatoes', '1', 'kg')];
  const rows = [required('tomato'), required('salt'), required('rice')];
  const summary = matchRecipeSummary({ usedIngredients: [rows[0]], missingIngredients: rows.slice(1) }, pantry);
  const detail = matchRecipeDetail({ ingredients: rows }, pantry);
  assert.equal(summary.basis, 'SUMMARY'); assert.equal(detail.basis, 'FULL_RECIPE');
  assert.deepEqual(summary.ingredients, detail.ingredients); assert.deepEqual(summary.shoppingItems, detail.shoppingItems);
  assert.equal(summary.ingredients[0].quantityStatus, 'CHECK_AMOUNT');
});
test('shopping names deduplicate alias/case variants, preserve distinct products and do not mutate inputs', () => {
  const rows = [required(' TOMATOES '), required('tomato'), required('red onion'), required('onion')];
  const before = JSON.stringify(rows); const result = match(rows, []);
  assert.deepEqual(result.shoppingItems.map(row => row.name), ['tomato', 'red onion', 'onion']);
  assert.equal(JSON.stringify(rows), before); assert.equal(match([], []).pantryNameMatchPercent, 0);
});
function database(rows, membership = { householdId: 'own-household', household: { timezone: 'Asia/Kolkata' } }) {
  const calls = {};
  return { calls, db: { $transaction: async (operation, options) => {
    calls.options = options;
    return operation({ householdMember: { findUnique: async query => { calls.member = query; return membership; } },
      pantryItem: { findMany: async query => { calls.query = query; return rows; } } });
  } } };
}
const dbRow = (name, expiresOn, id = name) => ({ id, name, quantity: { toString: () => '1' }, unit: 'pieces', expiresOn: new Date(expiresOn + 'T00:00:00Z') });
const now = () => new Date('2026-10-15T08:00:00Z');
test('full matching inventory is membership scoped, active/unarchived, non-expired and separate from rescue window', async () => {
  const { db, calls } = database([dbRow('tomato', '2026-10-15'), dbRow('rice', '2026-12-01')]);
  const result = await createChefService(db, now).inventory({ id: 'own-user' });
  assert.equal(calls.member.where.authSubject, 'own-user');
  assert.deepEqual(calls.query.where, { householdId: 'own-household', household: { members: { some: { authSubject: 'own-user' } } },
    status: 'ACTIVE', archivedAt: null, expiresOn: { gte: new Date('2026-10-15T00:00:00Z') } });
  assert.equal(calls.query.take, 1001); assert.equal(calls.options.isolationLevel, 'RepeatableRead');
  assert.deepEqual(result.ingredients.map(row => row.name), ['tomato']);
  assert.deepEqual(result.pantryIngredients.map(row => row.name), ['tomato', 'rice']);
});
test('full inventory and rescue limits fail explicitly; missing membership never queries groceries', async () => {
  await assert.rejects(createChefService(database(Array(1001).fill(dbRow('rice', '2026-12-01'))).db, now).inventory({ id: 'own-user' }), { code: 'CHEF_INVENTORY_LIMIT' });
  await assert.rejects(createChefService(database(Array(201).fill(dbRow('tomato', '2026-10-15'))).db, now).inventory({ id: 'own-user' }), { code: 'CHEF_INGREDIENT_LIMIT' });
  const absent = database([], null);
  await assert.rejects(createChefService(absent.db, now).inventory({ id: 'own-user' }), { code: 'HOUSEHOLD_REQUIRED' });
  assert.equal(absent.calls.query, undefined);
});
test('future inventory changes matching without sending full Pantry to provider; match never enters provider cache', async () => {
  let pantry = [stock('tomato')], reads = 0, searches = 0;
  const summary = { id: 123, usedIngredients: [required('tomato')], missingIngredients: [required('rice')] };
  const sourceBefore = JSON.stringify(summary);
  const service = createChefSuggestionsService({ inventory: async identity => {
    reads++; assert.equal(identity.id, 'own-user'); return { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata',
      window: 'HOUSEHOLD_TODAY_AND_TOMORROW', ingredients: [stock('tomato')], pantryIngredients: pantry };
  } }, { search: async names => { searches++; assert.deepEqual(names, ['tomato']); return [summary]; },
    detail: async () => ({ id: 123, ingredients: [required('tomato'), required('rice')] }) });
  const first = await service.suggest({ id: 'own-user' });
  assert.equal(first.recipes[0].match.shoppingItems[0].name, 'rice'); assert.equal('pantryIngredients' in first, false);
  pantry = [stock('tomato'), stock('rice')];
  const second = await service.suggest({ id: 'own-user' });
  assert.deepEqual(second.recipes[0].match.shoppingItems, []);
  const detail = await service.detail({ id: 'own-user' }, 123);
  assert.deepEqual(detail.match.shoppingItems, []); assert.equal(detail.match.basis, 'FULL_RECIPE');
  assert.equal(reads, 3); assert.equal(searches, 3); assert.equal(JSON.stringify(summary), sourceBefore);
});
test('two accounts never share Pantry matching even when provider summaries are identical', async () => {
  const service = createChefSuggestionsService({ inventory: async identity => ({ householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata',
    window: 'HOUSEHOLD_TODAY_AND_TOMORROW', ingredients: [stock('tomato')], pantryIngredients: identity.id === 'one' ? [stock('tomato'), stock('rice')] : [stock('tomato')] }) },
    { search: async () => [{ id: 123, usedIngredients: [required('tomato')], missingIngredients: [required('rice')] }] });
  assert.deepEqual((await service.suggest({ id: 'one' })).recipes[0].match.shoppingItems, []);
  assert.equal((await service.suggest({ id: 'two' })).recipes[0].match.shoppingItems[0].name, 'rice');
});


test('prototype-like names and units are ordinary unknown strings, never inherited dictionary entries', () => {
  assert.equal(canonicalIngredient('constructor'), 'constructor'); assert.equal(canonicalIngredient('__proto__'), '__proto__');
  const result = match([required('constructor', 1, 'constructor'), required('__proto__', 1, '__proto__')],
    [stock('constructor', '1', 'constructor'), stock('__proto__', '1', '__proto__')]);
  assert.deepEqual(result.ingredients.map(row => row.quantityStatus), ['CHECK_AMOUNT', 'CHECK_AMOUNT']);
});
test('full-inventory limit propagates through HTTP and prevents any recipe provider request', async () => {
  const request = require('supertest'); const { createApp } = require('../dist/app.js');
  const { ChefFailure } = require('../dist/services/chef.js'); let calls = 0;
  const service = createChefSuggestionsService({ inventory: async () => { throw new ChefFailure('CHEF_INVENTORY_LIMIT'); } },
    { search: async () => { calls++; return []; } });
  const app = createApp({ verifyIdentity: async () => ({ id: 'own-user' }), chefSuggestionsService: service });
  const res = await request(app).post('/api/v1/chef/suggestions').set('Authorization', 'Bearer a.b.c').send({});
  assert.equal(res.status, 503); assert.equal(res.body.error.code, 'CHEF_INVENTORY_LIMIT');
  assert.equal(res.body.error.requestId, res.headers['x-request-id']); assert.equal(calls, 0);
});
