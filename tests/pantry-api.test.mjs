import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPantryApi, manualPantryInput, rupeeValue } from '../lib/pantryApi.ts';
test('manual entry represents paise exactly and preserves unknown/free prices and decimal quantity text', () => {
  const draft = { name: 'Milk', category: 'Dairy', unit: 'l', quantity: '0.5', expiresOn: '2026-10-20', price: '60.50' };
  assert.equal(manualPantryInput(draft).totalCostMinor, 6050); assert.equal(manualPantryInput(draft).quantity, '0.5');
  assert.equal(manualPantryInput({ ...draft, price: '' }).totalCostMinor, null);
  assert.equal(manualPantryInput({ ...draft, price: '0' }).totalCostMinor, 0);
  for (const change of [{ price: '0.001' }, { quantity: '1.2345' }, { quantity: '0' }]) assert.throws(() => manualPantryInput({ ...draft, ...change }));
  assert.equal(rupeeValue(6050), '₹60.50'); assert.equal(rupeeValue(null), 'Unknown value');
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
