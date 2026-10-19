import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBarcodeInput, createBarcodeRetryStorage } from '../lib/barcodeEntry.ts';
import { barcodeLookupResult } from '../lib/barcodeLookup.ts';
import { createPantryApi } from '../lib/pantryApi.ts';
const fields = { name: 'Barcode Test Food', category: 'OTHER', quantity: '0.5', unit: 'bag', expiresOn: '2026-10-30', totalCostMinor: 6050, barcode: '3017620422003',
  expirySelection: { packageDate: '2026-10-30', userDate: null, preset: null } };
const key = 'barcode-test-request-123456';
function memory() {
  const values = new Map();
  return { values, get: async k => values.get(k) ?? null, set: async (k, v) => { values.set(k, v); }, remove: async k => { values.delete(k); } };
}
const catalog = () => ({ barcode: fields.barcode, status: 'FOUND', product: { catalogBarcode: fields.barcode, name: 'Food', brand: null, packageSize: null, categoryLabel: null },
  source: { provider: 'OPEN_FOOD_FACTS', environment: 'staging', license: 'ODbL-1.0', confidence: 'COMMUNITY_UNVERIFIED', url: `https://world.openfoodfacts.net/product/${fields.barcode}` } });
test('barcode saved intent canonicalizes identity and exact reviewed fields, rejects foreign/private metadata', () => {
  const clean = cleanBarcodeInput(fields);
  assert.equal(clean.barcode, '03017620422003'); assert.equal(clean.totalCostMinor, 6050); assert.equal(clean.quantity, '0.5');
  for (const change of [{ barcode: '3017620422004' }, { token: 'secret' }, { rawText: 'receipt' }, { source: 'MANUAL' }, { householdId: 'other' }, { totalCostMinor: -1 }]) {
    assert.throws(() => cleanBarcodeInput({ ...fields, ...change }));
  }
});
test('frozen key/payload restore after restart, cannot be overwritten, and clear requires the same key', async () => {
  const io = memory(), first = createBarcodeRetryStorage(io, 'branch/account');
  const candidate = { ...fields }; await first.save(candidate, key); candidate.name = 'Changed after confirmation';
  await assert.rejects(first.save({ ...fields, name: 'Other' }, 'barcode-another-request-123'), /RETRY_EXISTS/);
  const restarted = createBarcodeRetryStorage(io, 'branch/account');
  const saved = await restarted.load(); assert.equal(saved.key, key); assert.deepEqual(saved.input, cleanBarcodeInput(fields));
  saved.input.name = 'mutated'; assert.equal((await restarted.load()).input.name, fields.name);
  await restarted.clear('wrong-key'); assert.ok(await restarted.load());
  await restarted.clear(key); assert.equal(await restarted.load(), null); assert.equal(io.values.size, 0);
});
test('branch and account namespaces are isolated and Unicode chunks stay below native value bounds', async () => {
  const io = memory(), a = createBarcodeRetryStorage(io, 'branch/a'), b = createBarcodeRetryStorage(io, 'branch/b');
  await a.save({ ...fields, name: '🥦'.repeat(50) }, key);
  assert.equal(await b.load(), null);
  assert.ok([...io.values.values()].every(value => Buffer.byteLength(value) < 2048));
  await b.clear(); assert.ok(await a.load()); await a.clear(); assert.equal(io.values.size, 0);
});
test('sign-out invalidates in-flight writes before publishing a complete retry', async () => {
  const io = memory(); let release, writes = 0;
  const delayed = { ...io, set: async (k, v) => { if (++writes === 1) await new Promise(resolve => { release = resolve; }); await io.set(k, v); } };
  const store = createBarcodeRetryStorage(delayed, 'branch/a');
  const saving = store.save(fields, key);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const cleared = store.clear(); release();
  await assert.rejects(saving, /SESSION_CHANGED/); await cleared;
  assert.equal(await store.load(), null); assert.equal(io.values.size, 0);
});
test('partial or corrupt writes fail closed, and failed initial writes do not create a sendable intent', async () => {
  const io = memory(); let writes = 0;
  const store = createBarcodeRetryStorage({ ...io, set: async (k, v) => { if (++writes === 2) throw Error('disk'); await io.set(k, v); } }, 'branch/a');
  await assert.rejects(store.save(fields, key)); assert.equal(await store.load(), null);
  await store.clear();
  const good = createBarcodeRetryStorage(io, 'branch/a'); await good.save(fields, key);
  const chunk = [...io.values.keys()].find(k => k.endsWith('.0')); io.values.delete(chunk);
  await assert.rejects(good.load(), /INVALID_RETRY/); await good.clear();
});
test('catalog response validates source and barcode and keeps unknown fields explicit', () => {
  assert.deepEqual(barcodeLookupResult(catalog(), fields.barcode), catalog());
  for (const change of [{ barcode: '036000291452' }, { source: { ...catalog().source, url: 'https://evil.invalid' } }, { product: { ...catalog().product, name: '<b>Food</b>' } }, { status: 'NOT_FOUND' }]) {
    assert.throws(() => barcodeLookupResult({ ...catalog(), ...change }, fields.barcode));
  }
  assert.equal(barcodeLookupResult({ ...catalog(), status: 'NOT_FOUND', product: null }, fields.barcode).product, null);
});
test('lookup API authenticates only to FreshTrack; provider failures retain manual recovery', async () => {
  const api = createPantryApi('https://freshtrack.example.test', async () => 'fixture-token', false, async (url, options) => {
    assert.equal(url, `https://freshtrack.example.test/api/v1/scanner/barcodes/${fields.barcode}`);
    assert.equal(options.headers.Authorization, 'Bearer fixture-token'); assert.equal(options.credentials, 'omit');
    return new Response(JSON.stringify({ data: catalog() }), { headers: { 'content-type': 'application/json' } });
  });
  assert.equal((await api.barcodeLookup(fields.barcode)).status, 'FOUND');
  const limited = createPantryApi('https://freshtrack.example.test', async () => 'fixture-token', false, async () => new Response('{}', { status: 429 }));
  await assert.rejects(limited.barcodeLookup(fields.barcode), e => e.message.includes('manually'));
});
