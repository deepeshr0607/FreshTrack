import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPantryApi, manualPantryInput, requirePantryStatus, rupeeValue } from '../lib/pantryApi.ts';
test('reminder inventory reads live unfiltered pages and rejects changed or oversized inventories', async () => {
  const calls = [];
  const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async url => {
    calls.push(url); const page = Number(new URL(url).searchParams.get('page'));
    return Response.json({ data: { items: [{ id: `item-${page}` }], pagination: { total: 2, hasNextPage: page === 1 } } });
  });
  assert.equal((await api.reminderItems()).length, 2); assert.equal(calls.length, 2);
  assert.ok(calls.every(url => !url.includes('freshness=') && !url.includes('q=')));
  const changed = createPantryApi('https://api.example.com', async () => 'jwt', false, async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    return Response.json({ data: { items: [{ id: `item-${page}` }], pagination: { total: page, hasNextPage: true } } });
  });
  await assert.rejects(changed.reminderItems(), error => error.code === 'PANTRY_CHANGED');
  const oversized = createPantryApi('https://api.example.com', async () => 'jwt', false, async url => Response.json({
    data: { items: [{ id: url }], pagination: { total: 1001, hasNextPage: true } } }));
  await assert.rejects(oversized.reminderItems(), error => error.code === 'PANTRY_LIMIT');
});
test('manual entry represents paise exactly and preserves unknown/free prices and decimal quantity text', () => {
  const draft = { name: 'Milk', category: 'Dairy', unit: 'l', quantity: '0.5', expiresOn: '2026-10-20', price: '60.50' };
  assert.equal(manualPantryInput(draft).totalCostMinor, 6050); assert.equal(manualPantryInput(draft).quantity, '0.5');
  assert.equal(manualPantryInput({ ...draft, price: '' }).totalCostMinor, null);
  assert.equal(manualPantryInput({ ...draft, price: '0' }).totalCostMinor, 0);
  for (const change of [{ price: '0.001' }, { quantity: '1.2345' }, { quantity: '0' }]) assert.throws(() => manualPantryInput({ ...draft, ...change }));
  assert.equal(rupeeValue(6050), '₹60.50'); assert.equal(rupeeValue(null), 'Unknown value');
});
test('a replay superseded by a later outcome cannot be announced as successful undo', () => {
  assert.doesNotThrow(() => requirePantryStatus([{ status: 'ACTIVE' }], 'ACTIVE'));
  assert.throws(() => requirePantryStatus([{ status: 'WASTED' }], 'ACTIVE'), { code: 'PANTRY_CHANGED' });
  assert.throws(() => requirePantryStatus([{ status: 'ACTIVE' }], 'CONSUMED'), { code: 'PANTRY_CHANGED' });
});
test('batch outcome/undo and item undo preserve selected versions, confirmation and retry keys', async () => {
  const calls = []; const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async (url, options) => {
    calls.push([url, JSON.parse(options.body), options.headers['Idempotency-Key']]); return Response.json({ data: {} });
  });
  const selected = { confirmed: true, items: [{ id: 'item', expectedUpdatedAt: '2026-10-12T00:00:00.000Z' }] };
  await api.batchOutcome({ ...selected, action: 'consume' }, 'batch-key-123456789');
  await api.batchUndo(selected, 'undo-key-123456789');
  await api.undo('item', { confirmed: true, expectedUpdatedAt: selected.items[0].expectedUpdatedAt }, 'single-key-123456789');
  assert.equal(calls[0][0], 'https://api.example.com/api/v1/pantry/batch-outcome'); assert.deepEqual(calls[0][1].items, selected.items);
  assert.equal(calls[1][0], 'https://api.example.com/api/v1/pantry/batch-undo'); assert.deepEqual(calls[1][1], selected);
  assert.equal(calls[2][0], 'https://api.example.com/api/v1/pantry/item/undo-status'); assert.equal(calls[2][2], 'single-key-123456789');
});
test('edit and outcome clients send the loaded version and explicit confirmation with replay keys', async () => {
  const calls = []; const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async (url, options) => {
    calls.push([url, options]); return Response.json({ data: {} });
  });
  const version = '2026-10-12T00:00:00.000Z';
  await api.edit('item-id', { expectedUpdatedAt: version, name: 'Edited' }, 'edit-retry-key-1234');
  await api.outcome('item-id', 'waste', { confirmed: true, expectedUpdatedAt: version }, 'outcome-retry-key-1234');
  assert.equal(calls[0][1].method, 'PATCH'); assert.equal(JSON.parse(calls[0][1].body).expectedUpdatedAt, version);
  assert.equal(calls[1][0], 'https://api.example.com/api/v1/pantry/item-id/waste');
  assert.deepEqual(JSON.parse(calls[1][1].body), { confirmed: true, expectedUpdatedAt: version });
  assert.equal(calls[1][1].headers['Idempotency-Key'], 'outcome-retry-key-1234');
});
test('client scopes requests through bearer only and passes an unchanged retry key without client identity', async () => {
  const calls = []; const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async (url, options) => {
    calls.push([url, options]); return Response.json({ data: {} });
  });
  await api.setup(); await api.list(2); await api.add({ name: 'Milk' }, 'manual-key-123456');
  assert.equal(calls[0][1].body, '{}'); assert.match(calls[1][0], /page=2&pageSize=50$/);
  assert.equal(calls[2][1].headers['Idempotency-Key'], 'manual-key-123456');
  for (const [, options] of calls) { assert.equal(options.credentials, 'omit'); assert.equal(options.headers.Authorization, 'Bearer jwt'); }
});
test('client validates transport before credentials and never relays server/driver error details', async () => {
  const bad = createPantryApi('http://public.example.com', async () => assert.fail('No credentials for invalid URL'));
  await assert.rejects(bad.list(), { code: 'API_CONFIG' });
  const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async () => Response.json({ error: 'private-driver-error' }, { status: 503 }));
  await assert.rejects(api.list(), error => error.code === 'PANTRY_HTTP_503' && !error.message.includes('private-driver'));
});

test('server list client preserves full criteria on subsequent pages and safely encodes search metacharacters', async () => {
  const urls = []; const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async url => {
    urls.push(new URL(url)); return Response.json({ data: {} });
  });
  const filters = { q: '100%_\\ milk & bread', category: 'DAIRY', freshness: 'fresh', sort: 'name' };
  await api.list(1, filters); await api.list(2, filters);
  for (const url of urls) {
    for (const [key, value] of Object.entries(filters)) assert.equal(url.searchParams.get(key), value);
    assert.equal(url.searchParams.get('pageSize'), '50');
  }
  assert.equal(urls[1].searchParams.get('page'), '2');
  await api.list(1, {}); assert.equal(urls[2].searchParams.has('q'), false); assert.equal(urls[2].searchParams.has('category'), false);
});

test('duplicate-check is read-only JSON; explicit separate save preserves the same confirmed payload and replay key', async () => {
  const calls = []; const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async (url, options) => {
    calls.push([url, options]); return Response.json({ data: {} });
  });
  const input = { name: 'Milk', duplicateConfirmation: { confirmed: true, action: 'add_separately' } };
  await api.duplicates({ name: 'Milk' }); await api.add(input, 'separate-retry-123'); await api.add(input, 'separate-retry-123');
  assert.equal(calls[0][0], 'https://api.example.com/api/v1/pantry/duplicate-check'); assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers['Idempotency-Key'], undefined); assert.equal(calls[1][1].body, calls[2][1].body);
  assert.equal(calls[1][1].headers['Idempotency-Key'], calls[2][1].headers['Idempotency-Key']);
});
test('only the whitelisted duplicate conflict code is relayed; response messages stay private', async () => {
  const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async () => Response.json({ error: { code: 'PANTRY_DUPLICATE', message: 'private-driver-details' } }, { status: 409 }));
  await assert.rejects(api.add({}, 'retry-key-12345678'), error => error.code === 'PANTRY_DUPLICATE' && !error.message.includes('private-driver'));
});

test('failed duplicate previews do not imply a save; failed writes preserve uncertainty without exposing transport details', async () => {
  const api = createPantryApi('https://api.example.com', async () => 'jwt', false, async () => { throw Error('private-network-details'); });
  await assert.rejects(api.duplicates({}), error => error.code === 'PANTRY_NETWORK' && !error.message.includes('A save') && !error.message.includes('private-network'));
  await assert.rejects(api.add({}, 'retry-key-12345678'), error => error.code === 'PANTRY_NETWORK' && error.message.includes('A save may have completed') && !error.message.includes('private-network'));
});
