const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { receiptInput, PantryFailure } = require('../dist/services/pantry.js');
const { AuthFailure } = require('../dist/services/auth.js');
const item = { name: '  Review   Milk ', category: 'DAIRY', quantity: '0.500', unit: ' l ', expiresOn: '2026-10-20', totalCostMinor: 6050 };
const review = { items: [{ rowId: 'milk', item }] };
const identity = { id: 'freshtrack-dev-test:receipt', email: 'fixture@example.test', name: 'Fixture' };
const verifyIdentity = async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; };
const auth = req => req.set('Authorization', 'Bearer a.b.c');
test('receipt input is bounded, canonical and accepts reviewed fields only', () => {
  const result = receiptInput({ items: [{ rowId: 'z', item }, { rowId: 'a', item: { ...item, totalCostMinor: null } }] });
  assert.deepEqual(result.items.map(row => row.rowId), ['a', 'z']);
  assert.equal(result.items[1].item.name, 'Review Milk'); assert.equal(result.items[1].item.quantity, '0.5');
  for (const body of [null, [], {}, { items: [] }, { items: Array(21).fill(review.items[0]) }, { ...review, userId: 'foreign' },
    { ...review, rawText: 'receipt' }, { ...review, image: 'file://private' }, { ...review, confirmed: true },
    { items: [review.items[0], review.items[0]] }, { items: [{ rowId: '../../x', item }] },
    { items: [{ ...review.items[0], householdId: 'foreign' }] }, { items: [{ rowId: 'x', item: { ...item, receiptScanId: 'foreign' } }] },
    { items: [{ rowId: 'x', item: { ...item, quantity: '0' } }] }, { items: [{ rowId: 'x', item: { ...item, totalCostMinor: 1.5 } }] },
    { items: [{ rowId: 'x', item: { ...item, expiresOn: '2026-02-30' } }] }]) assert.throws(() => receiptInput(body));
});
test('receipt import requires explicit confirmation and review cannot smuggle duplicate decisions', () => {
  const separate = { confirmed: true, action: 'add_separately' };
  for (const confirmed of [false, null, undefined, 'true']) assert.throws(() => receiptInput({ ...review, confirmed }, true));
  const body = { confirmed: true, items: [{ rowId: 'milk', item: { ...item, duplicateConfirmation: separate } }] };
  assert.deepEqual(receiptInput(body, true).items[0].item.duplicateConfirmation, separate);
  assert.throws(() => receiptInput({ items: body.items }));
  assert.equal(receiptInput({ confirmed: true, items: [{ rowId: 'a', item: { ...item, totalCostMinor: 0 } }] }, true).items[0].item.totalCostMinor, 0);
});
test('receipt HTTP routes authenticate and reject invalid bodies/keys before any service call', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity, pantryService: {
    receiptReview: async (user, input) => { calls++; assert.equal(user.id, identity.id); assert.equal(input.items[0].item.name, 'Review Milk'); return { rows: [] }; },
    receiptImport: async (user, input, key) => { calls++; assert.equal(user.id, identity.id); assert.equal(input.confirmed, true); assert.equal(key, 'receipt-retry-123456'); return { receiptScanId: 'saved', items: [], replayed: false }; },
  } });
  for (const path of ['/api/v1/pantry/receipt-review', '/api/v1/pantry/receipt-import']) {
    assert.equal((await request(app).post(path).send(review)).status, 401);
    assert.equal((await auth(request(app).post(path + '?userId=foreign')).send(review)).status, 400);
    assert.equal((await auth(request(app).post(path)).send({ ...review, householdId: 'foreign' })).status, 400);
  }
  assert.equal((await auth(request(app).post('/api/v1/pantry/receipt-import')).send({ ...review, confirmed: true })).status, 400);
  assert.equal(calls, 0);
  const checked = await auth(request(app).post('/api/v1/pantry/receipt-review')).send(review);
  assert.equal(checked.status, 200); assert.equal(checked.headers['cache-control'], 'no-store');
  const saved = await auth(request(app).post('/api/v1/pantry/receipt-import')).set('Idempotency-Key', 'receipt-retry-123456').send({ ...review, confirmed: true });
  assert.equal(saved.status, 200); assert.equal(saved.body.data.receiptScanId, 'saved'); assert.equal(calls, 2);
});
test('receipt duplicate, retry conflict and unavailable errors expose safe envelopes only', async () => {
  for (const [code, status] of [['PANTRY_DUPLICATE', 409], ['IDEMPOTENCY_CONFLICT', 409], ['PANTRY_UNAVAILABLE', 503], ['HOUSEHOLD_REQUIRED', 409]]) {
    const app = createApp({ verifyIdentity, pantryService: { receiptImport: async () => { throw new PantryFailure(code); } } });
    const response = await auth(request(app).post('/api/v1/pantry/receipt-import')).set('Idempotency-Key', 'receipt-retry-123456').send({ ...review, confirmed: true });
    assert.equal(response.status, status); assert.equal(response.body.error.code, code);
    assert.equal(response.body.error.requestId, response.headers['x-request-id']); assert.equal(response.body.data, undefined);
  }
});
