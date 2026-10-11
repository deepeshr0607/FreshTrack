import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPantryItem, expiryDays, pantryReducer, validatePantryDraft, validatePantryEdit } from '../lib/pantry.ts';

const item = { id: 'test-1', name: 'Milk', quantity: 1, unit: 'bottle', expiresOn: '2026-10-12',
  daysLeft: 2, category: 'Dairy', price: 4.49, status: 'ACTIVE', expirySource: 'PACKAGE_DATE', imageEmoji: '🥛' };
const edit = { name: ' Whole Milk ', quantity: '2', unit: ' bottles ', expiresOn: '2026-10-14' };

test('editing preserves identity, price and category while updating fields and expiry source', () => {
  const result = pantryReducer([item], { type: 'edit', id: item.id, edit });
  assert.equal(result[0].name, 'Whole Milk');
  assert.equal(result[0].quantity, 2);
  assert.equal(result[0].unit, 'bottles');
  assert.equal(result[0].expirySource, 'USER_ENTERED');
  for (const key of ['id', 'price', 'category', 'status']) assert.equal(result[0][key], item[key]);
  assert.equal(item.name, 'Milk');
});

test('saving without a date change preserves confirmed expiry source', () => {
  const result = pantryReducer([item], { type: 'edit', id: item.id, edit: { ...edit, expiresOn: item.expiresOn } });
  assert.equal(result[0].expirySource, 'PACKAGE_DATE');
});

test('invalid dates, names, units and quantities cannot change inventory', () => {
  const items = [item];
  for (const invalid of [{ name: ' ' }, { unit: '' }, { quantity: '0' }, { quantity: '-1' },
    { quantity: 'NaN' }, { quantity: 'Infinity' }, { expiresOn: '2026-02-30' },
    { expiresOn: '2026-13-01' }, { expiresOn: '12/10/2026' }]) {
    const value = { ...edit, ...invalid };
    assert.ok(validatePantryEdit(value));
    assert.equal(pantryReducer(items, { type: 'edit', id: item.id, edit: value }), items);
  }
  assert.equal(validatePantryEdit({ ...edit, quantity: '0.5', expiresOn: '2028-02-29' }), null);
});

test('used and wasted statuses hide active items and prevent repeated resolution or editing', () => {
  for (const status of ['CONSUMED', 'WASTED']) {
    const result = pantryReducer([item], { type: 'status', id: item.id, status });
    assert.equal(result.filter((entry) => entry.status === 'ACTIVE').length, 0);
    assert.equal(pantryReducer(result, { type: 'status', id: item.id, status: 'WASTED' })[0], result[0]);
    assert.equal(pantryReducer(result, { type: 'edit', id: item.id, edit })[0], result[0]);
  }
});

test('unknown IDs preserve entries', () => {
  assert.equal(pantryReducer([item], { type: 'edit', id: 'missing', edit })[0], item);
});

test('expiry uses local calendar days across month/year boundaries and includes past dates', () => {
  assert.equal(expiryDays('2027-01-01', new Date(2026, 11, 31, 23, 30)), 1);
  assert.equal(expiryDays('2026-10-10', new Date(2026, 9, 10, 23, 30)), 0);
  assert.equal(expiryDays('2026-10-09', new Date(2026, 9, 10)), -1);
});

const draft = { ...edit, category: 'Dairy', price: '8.98' };

test('manual insertion preserves existing items and creates a typed, trimmed active item', () => {
  const original = [item];
  const result = pantryReducer(original, { type: 'add', id: 'manual-1', draft });
  assert.equal(result.length, 2);
  assert.equal(original.length, 1);
  assert.equal(result[1], item);
  assert.deepEqual(result[0], { id: 'manual-1', name: 'Whole Milk', quantity: 2, unit: 'bottles',
    category: 'Dairy', price: 8.98, expiresOn: draft.expiresOn, daysLeft: expiryDays(draft.expiresOn),
    expirySource: 'USER_ENTERED', status: 'ACTIVE', source: 'MANUAL', imageEmoji: '🥛' });
  assert.equal(pantryReducer(result, { type: 'add', id: 'manual-1', draft }), result);
});

test('invalid manual fields never insert an item', () => {
  const original = [item];
  for (const invalid of [{ name: ' ' }, { unit: '' }, { quantity: '0' }, { quantity: '-2' },
    { quantity: '0x10' }, { quantity: '1e2' }, { quantity: 'Infinity' }, { expiresOn: '2026-02-30' },
    { price: '-1' }, { price: 'NaN' }, { price: '1.2.3' }, { price: 'Infinity' }, { category: 'Invalid' }]) {
    assert.ok(validatePantryDraft({ ...draft, ...invalid }));
    assert.equal(pantryReducer(original, { type: 'add', id: 'manual-1', draft: { ...draft, ...invalid } }), original);
  }
  assert.equal(createPantryItem('', draft), null);
});

test('manual entry supports fractional comma-decimal quantities, unknown and zero purchase value', () => {
  const unknown = createPantryItem('manual-1', { ...draft, quantity: '0,5', price: '' });
  assert.equal(unknown.quantity, 0.5);
  assert.equal(unknown.price, 0);
  assert.match(unknown.note, /unknown/);
  const known = createPantryItem('manual-2', { ...draft, price: '0' });
  assert.equal(known.price, 0);
  assert.equal(known.note, undefined);
  assert.equal(createPantryItem('manual-3', { ...draft, price: '4,50' }).price, 4.5);
});

test('past-date manual entries can be reconciled and resolved only once', () => {
  const added = pantryReducer([], { type: 'add', id: 'manual-1', draft: { ...draft, expiresOn: '2020-01-01' } });
  assert.ok(added[0].daysLeft < 0);
  const resolved = pantryReducer(added, { type: 'status', id: 'manual-1', status: 'WASTED' });
  assert.equal(resolved[0].status, 'WASTED');
  assert.equal(pantryReducer(resolved, { type: 'status', id: 'manual-1', status: 'CONSUMED' })[0], resolved[0]);
});

test('batch resolution updates only explicitly selected active entries and cannot replay', () => {
  const other = { ...item, id: 'test-2', name: 'Yogurt' };
  const untouched = { ...item, id: 'test-3', name: 'Eggs' };
  const entries = [item, other, untouched];
  for (const status of ['CONSUMED', 'WASTED']) {
    const action = { type: 'batch-status', ids: [item.id, other.id], status };
    const resolved = pantryReducer(entries, action);
    assert.equal(resolved[0].status, status);
    assert.equal(resolved[1].status, status);
    assert.equal(resolved[2], untouched);
    assert.equal(resolved[0].price, item.price);
    assert.equal(item.status, 'ACTIVE');
    assert.equal(pantryReducer(resolved, action), resolved);
  }
});

test('empty, duplicate, missing and stale batch selections reject the entire update', () => {
  const resolved = { ...item, id: 'resolved', status: 'WASTED' };
  const entries = [item, resolved];
  for (const ids of [[], [item.id, item.id], [item.id, 'missing'], [item.id, resolved.id]]) {
    assert.equal(pantryReducer(entries, { type: 'batch-status', ids, status: 'CONSUMED' }), entries);
    assert.equal(entries[0].status, 'ACTIVE');
  }
});
