import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPantryReadCache, cacheablePantryFailure } from '../lib/pantryReadCache.ts';
const owner = 'development:user-a';
const at = new Date('2026-10-12T12:00:00Z');
const item = (id, fields = {}) => ({ id, name: 'Milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20',
  totalCostMinor: 6050, currencyCode: 'INR', status: 'ACTIVE', source: 'MANUAL', expirySource: 'USER_ENTERED',
  daysLeft: 8, freshness: 'fresh', createdAt: at.toISOString(), updatedAt: at.toISOString(), ...fields });
test('cached data is owner scoped, isolated across instances and cleared at teardown', () => {
  const cache = createPantryReadCache(owner); cache.remember(owner, [item('milk')], false, at);
  assert.equal(cache.read('production:user-a', {}, at), null);
  assert.equal(cache.find('development:user-b', 'milk', at), null);
  cache.remember('development:user-b', [item('foreign')]);
  assert.equal(cache.read(owner, {}, at).items.length, 1);
  assert.equal(createPantryReadCache(owner).read(owner, {}, at), null);
  cache.clear(); assert.equal(cache.read(owner, {}, at), null);
});
test('cache snapshots preserve exact quantities/costs, isolate caller mutations and recompute Kolkata calendar days', () => {
  const cache = createPantryReadCache(owner), original = item('milk', { expiresOn: '2026-10-14' });
  cache.remember(owner, [original], false, at); original.quantity = '999';
  const before = cache.read(owner, { freshness: 'caution' }, new Date('2026-10-12T18:29:59Z'));
  assert.equal(before.items[0].daysLeft, 2); assert.equal(before.items[0].quantity, '0.5'); assert.equal(before.items[0].totalCostMinor, 6050);
  before.items[0].name = 'Changed view';
  const after = cache.read(owner, { freshness: 'critical' }, new Date('2026-10-12T18:30:00Z'));
  assert.equal(after.items[0].daysLeft, 1); assert.equal(after.items[0].name, 'Milk');
});
test('cached filters compose over the known subset and counts never imply unknown server matches', () => {
  const cache = createPantryReadCache(owner);
  cache.remember(owner, [item('milk'), item('apples', { name: 'Green Apples', category: 'PRODUCE', expiresOn: '2026-10-16' }), item('bread', { name: 'Bread', category: 'BAKERY', expiresOn: '2026-10-12' })], false, at);
  const result = cache.read(owner, { q: '  GREEN   apples ', category: 'PRODUCE', freshness: 'caution' }, at);
  assert.deepEqual(result.items.map(row => row.id), ['apples']); assert.equal(result.total, 1);
  assert.equal(result.inventory.active, 3); assert.equal(result.inventory.categories.DAIRY, 1);
  assert.equal(cache.read(owner, { q: 'apples', category: 'DAIRY' }, at).total, 0);
  assert.deepEqual(cache.read(owner, { sort: 'category' }, at).items.map(row => row.id), ['bread', 'milk', 'apples']);
});
test('resolved outcomes are removed and an authoritative empty read clears stale cached records', () => {
  const cache = createPantryReadCache(owner);
  cache.remember(owner, [item('milk'), item('apples')], false, at);
  cache.remove(owner, ['milk']); cache.remember(owner, [item('apples', { status: 'CONSUMED' })]);
  assert.equal(cache.read(owner, {}, at).items.length, 0);
  cache.remember(owner, [item('new')]); cache.remember(owner, [], true, at);
  assert.equal(cache.find(owner, 'new', at), null); assert.equal(cache.read(owner, {}, at).total, 0);
});
test('older versions cannot overwrite acknowledged edits; cache evicts beyond 200 entries', () => {
  const cache = createPantryReadCache(owner);
  cache.remember(owner, [item('milk', { name: 'Edited milk', updatedAt: '2026-10-12T13:00:00.000Z' })]);
  cache.remember(owner, [item('milk')]); assert.equal(cache.find(owner, 'milk', at).name, 'Edited milk');
  cache.remember(owner, Array.from({ length: 205 }, (_, id) => item(String(id))));
  assert.equal(cache.read(owner, {}, at).inventory.active, 200); assert.equal(cache.find(owner, '0', at), null);
  assert.ok(cache.find(owner, '204', at));
});
test('only transport/service availability failures permit cached fallback, never auth/validation/conflicts', () => {
  for (const code of ['NETWORK', 'PANTRY_NETWORK', 'PANTRY_HTTP_500', 'PANTRY_HTTP_502', 'PANTRY_HTTP_503', 'PANTRY_HTTP_504']) assert.equal(cacheablePantryFailure(code), true);
  for (const code of ['UNAUTHORIZED', 'SESSION', 'PANTRY_VERSION', 'PANTRY_HTTP_401', 'PANTRY_HTTP_403', 'PANTRY_HTTP_404', 'PANTRY_HTTP_409', 'PANTRY_HTTP_429', 'INVALID_REQUEST']) assert.equal(cacheablePantryFailure(code), false);
});
