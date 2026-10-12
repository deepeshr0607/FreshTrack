const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { pantryInput, pantryEditInput, pantryOutcomeInput, pantryBatchInput, PantryFailure } = require('../dist/services/pantry.js');
const { AuthFailure } = require('../dist/services/auth.js');
const valid = { name: '  Milk  ', category: 'DAIRY', quantity: '0.500', unit: ' l ', expiresOn: '2026-10-20', totalCostMinor: 6050 };
test('manual input keeps paise and exact quantities; rejects identity overrides and invalid domain fields', () => {
  assert.deepEqual(pantryInput(valid), { ...valid, name: 'Milk', quantity: '0.5', unit: 'l' });
  for (const fields of [{ userId: 'victim' }, { householdId: 'victim' }, { name: '' }, { name: 'secret\u0000' },
    { unit: 'x'.repeat(33) }, { quantity: '0' }, { quantity: '1.2345' }, { quantity: 1 }, { totalCostMinor: -1 },
    { totalCostMinor: 1.2 }, { totalCostMinor: undefined }, { expiresOn: '2026-02-30' }, { category: 'Unknown' }]) {
    assert.throws(() => pantryInput({ ...valid, ...fields }));
  }
  assert.equal(pantryInput({ ...valid, totalCostMinor: null }).totalCostMinor, null);
  assert.equal(pantryInput({ ...valid, totalCostMinor: 0 }).totalCostMinor, 0);
});
test('batch validation requires confirmation, unique versioned items, bounded size and an allowed action', () => {
  const item = { id: '11111111-1111-1111-1111-111111111111', expectedUpdatedAt: '2026-10-12T00:00:00.000Z' };
  const valid = { confirmed: true, action: 'consume', items: [item] };
  assert.equal(pantryBatchInput(valid).items.length, 1);
  assert.deepEqual(pantryBatchInput({ confirmed: true, items: [item] }, false), { confirmed: true, items: [item] });
  for (const changes of [{ confirmed: false }, { items: [] }, { items: [item, item] }, { items: Array(21).fill(item) },
    { userId: 'victim' }, { action: 'delete' }, { items: [{ ...item, householdId: 'victim' }] }, { items: [{ ...item, expectedUpdatedAt: '' }] }]) {
    assert.throws(() => pantryBatchInput({ ...valid, ...changes }));
  }
  assert.throws(() => pantryBatchInput(valid, false));
});
test('batch/undo HTTP boundaries authenticate and validate before service work', async () => {
  let writes = 0;
  const input = { confirmed: true, items: [{ id: '11111111-1111-1111-1111-111111111111', expectedUpdatedAt: '2026-10-12T00:00:00.000Z' }] };
  const app = createApp({ verifyIdentity, pantryService: {
    batch: async (user, body, action, key) => { writes++; assert.equal(user.id, identity.id); assert.equal(key, 'batch-retry-key-123'); return [{ id: body.items[0].id }]; },
    undo: async (user, id, body) => { writes++; assert.equal(user.id, identity.id); assert.equal(body.confirmed, true); return { id }; },
  } });
  assert.equal((await request(app).post('/api/v1/pantry/batch-outcome').send({ ...input, action: 'waste' })).status, 401);
  for (const [path, body] of [['/api/v1/pantry/batch-outcome', { ...input, action: 'waste' }], ['/api/v1/pantry/batch-undo', input],
    [`/api/v1/pantry/${input.items[0].id}/undo-status`, { confirmed: true, expectedUpdatedAt: input.items[0].expectedUpdatedAt }]]) {
    const response = await request(app).post(path).set('Authorization', 'Bearer a.b.c').set('Idempotency-Key', 'batch-retry-key-123').send(body);
    assert.equal(response.status, 200);
  }
  assert.equal(writes, 3);
  assert.equal((await request(app).post('/api/v1/pantry/batch-outcome').set('Authorization', 'Bearer a.b.c').set('Idempotency-Key', 'batch-retry-key-123')
    .send({ ...input, items: [] })).status, 400);
  assert.equal(writes, 3);
});
test('editing requires a valid version; outcome requires explicit confirmation and accepts no identity/status fields', () => {
  const expectedUpdatedAt = '2026-10-12T00:00:00.000Z';
  assert.equal(pantryEditInput({ ...valid, expectedUpdatedAt }).quantity, '0.5');
  for (const version of [undefined, 'bad', '2026-02-30T00:00:00.000Z']) assert.throws(() => pantryEditInput({ ...valid, expectedUpdatedAt: version }));
  assert.deepEqual(pantryOutcomeInput({ confirmed: true, expectedUpdatedAt }), { confirmed: true, expectedUpdatedAt });
  for (const change of [{ confirmed: false }, { userId: 'victim' }, { status: 'ACTIVE' }, { expectedUpdatedAt: '' }]) {
    assert.throws(() => pantryOutcomeInput({ confirmed: true, expectedUpdatedAt, ...change }));
  }
});
test('mutation HTTP routes enforce auth, validation and retry key before service writes', async () => {
  let calls = 0; const id = '11111111-1111-1111-1111-111111111111'; const expectedUpdatedAt = '2026-10-12T00:00:00.000Z';
  const service = {
    edit: async (account, itemId, input, key) => { calls++; assert.equal(account.id, identity.id); assert.equal(itemId, id); assert.equal(key, 'mutation-key-123456'); return { id }; },
    outcome: async (account, itemId, action, input) => { calls++; assert.equal(account.id, identity.id); assert.equal(itemId, id); assert.equal(input.confirmed, true); return { id, status: action }; },
  };
  const app = createApp({ verifyIdentity, pantryService: service });
  assert.equal((await request(app).post(`/api/v1/pantry/${id}/consume`).send({ confirmed: true, expectedUpdatedAt })).status, 401);
  assert.equal((await request(app).patch(`/api/v1/pantry/${id}`).set('Authorization', 'Bearer a.b.c').set('Idempotency-Key', 'mutation-key-123456').send({ ...valid, expectedUpdatedAt })).status, 200);
  for (const action of ['consume', 'waste']) {
    assert.equal((await request(app).post(`/api/v1/pantry/${id}/${action}`).set('Authorization', 'Bearer a.b.c')
      .set('Idempotency-Key', 'mutation-key-123456').send({ confirmed: true, expectedUpdatedAt })).status, 200);
  }
  assert.equal(calls, 3);
  assert.equal((await request(app).post(`/api/v1/pantry/${id}/consume`).set('Authorization', 'Bearer a.b.c').set('Idempotency-Key', 'mutation-key-123456').send({ confirmed: false, expectedUpdatedAt })).status, 400);
  assert.equal((await request(app).patch(`/api/v1/pantry/${id}`).set('Authorization', 'Bearer a.b.c').send({ ...valid, expectedUpdatedAt })).status, 400);
  assert.equal(calls, 3);
});
const identity = { id: 'freshtrack-dev-test:pantry', email: 'fixture@example.test', name: 'Fixture' };
const verifyIdentity = async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; };
test('Pantry routes require identity; validated create/list/detail derive it only from the verified session', async () => {
  const calls = [];
  const pantryService = {
    list: async (account, pagination) => { calls.push([account, pagination]); return { items: [], pagination }; },
    create: async (account, input, key) => { calls.push([account, input, key]); return { id: 'saved-item' }; },
    find: async (account, id) => { calls.push([account, id]); return { id }; },
  };
  const app = createApp({ verifyIdentity, pantryService });
  assert.equal((await request(app).get('/api/v1/pantry')).status, 401);
  assert.equal(calls.length, 0);
  const saved = await request(app).post('/api/v1/pantry').set('Authorization', 'Bearer a.b.c')
    .set('Idempotency-Key', 'manual-retry-key-123').set('x-user-id', 'victim').send(valid);
  assert.equal(saved.status, 200); assert.equal(saved.headers['cache-control'], 'no-store');
  assert.equal(calls[0][0].id, identity.id); assert.equal(calls[0][1].totalCostMinor, 6050);
  assert.equal(calls[0][2], 'manual-retry-key-123');
  assert.equal((await request(app).get('/api/v1/pantry?page=2&pageSize=5').set('Authorization', 'Bearer a.b.c')).status, 200);
  assert.deepEqual(calls[1][1], { page: 2, pageSize: 5 });
  assert.equal((await request(app).get('/api/v1/pantry/11111111-1111-1111-1111-111111111111').set('Authorization', 'Bearer a.b.c')).status, 200);
});
test('bad request bodies, retry keys, item IDs and pagination fail before accessing pantry services', async () => {
  const unexpected = async () => assert.fail('Service must not be reached');
  const app = createApp({ verifyIdentity, pantryService: { list: unexpected, create: unexpected, find: unexpected } });
  for (const path of ['/api/v1/pantry?page=0', '/api/v1/pantry?page=1&page=2', '/api/v1/pantry?userId=victim', '/api/v1/pantry/not-an-id']) {
    assert.equal((await request(app).get(path).set('Authorization', 'Bearer a.b.c')).status, 400);
  }
  assert.equal((await request(app).post('/api/v1/pantry').set('Authorization', 'Bearer a.b.c').send(valid)).status, 400);
  assert.equal((await request(app).post('/api/v1/pantry').set('Authorization', 'Bearer a.b.c')
    .set('Idempotency-Key', 'manual-retry-key-123').send({ ...valid, householdId: 'victim' })).status, 400);
});
test('pantry failures are safe HTTP envelopes with server-owned request IDs', async () => {
  for (const [code, status] of [['PANTRY_UNAVAILABLE', 503], ['HOUSEHOLD_REQUIRED', 409], ['IDEMPOTENCY_CONFLICT', 409], ['ITEM_NOT_FOUND', 404]]) {
    const fail = async () => { throw new PantryFailure(code); };
    const app = createApp({ verifyIdentity, pantryService: { list: fail, create: fail, find: fail } });
    const response = await request(app).get('/api/v1/pantry').set('Authorization', 'Bearer a.b.c');
    assert.equal(response.status, status); assert.equal(response.body.error.code, code);
    assert.equal(response.body.error.requestId, response.headers['x-request-id']);
  }
});

test('explicit expiry choices validate precedence and reject mismatched dates or injected metadata', () => {
  const expirySelection = { packageDate: '2026-10-25', userDate: '2026-10-20', preset: { baseDate: '2026-10-12', days: 7 } };
  const selected = pantryInput({ ...valid, expiresOn: '2026-10-25', expirySelection });
  assert.equal(selected.expiresOn, '2026-10-25'); assert.deepEqual(selected.expirySelection, expirySelection);
  assert.throws(() => pantryInput({ ...valid, expirySelection }));
  assert.throws(() => pantryInput({ ...valid, expirySource: 'PACKAGE_DATE' }));
  assert.throws(() => pantryInput({ ...valid, freshnessPresetDays: 7 }));
  assert.throws(() => pantryInput({ ...valid, expirySelection: { ...expirySelection, preset: { baseDate: '2026-10-12', days: 0 } } }));
});

const { pantryListQuery, pantryListWhere, pantryListOrder } = require('../dist/lib/pantryQuery.js');
test('list query normalizes search and strictly bounds every raw filter, duplicate and pagination field', () => {
  const result = pantryListQuery(new URLSearchParams('q=%20Whole%20%20MILK%20&category=DAIRY&freshness=caution&sort=name&page=2&pageSize=1'));
  assert.deepEqual(result, { pagination: { page: 2, pageSize: 1 }, filters: { q: 'whole milk', category: 'DAIRY', freshness: 'caution', sort: 'name' } });
  for (const query of ['q=a&q=b', 'category=DAIRY&category=OTHER', 'freshness=expired', 'sort=desc', 'category=dairy',
    'q[x]=milk', 'householdId=foreign', 'status=WASTED', 'pageSize=101', 'q=%00', 'q=' + 'x'.repeat(121)]) {
    assert.throws(() => pantryListQuery(new URLSearchParams(query)));
  }
});
test('freshness uses household calendar tiers and literal LIKE search with stable order ties', () => {
  const now = new Date('2026-10-12T18:30:00Z');
  const critical = pantryListWhere({ freshness: 'critical' }, 'Asia/Kolkata', now);
  assert.equal(critical.expiresOn.lte.toISOString(), '2026-10-14T00:00:00.000Z');
  const caution = pantryListWhere({ freshness: 'caution' }, 'Asia/Kolkata', now);
  assert.equal(caution.expiresOn.gte.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(caution.expiresOn.lte.toISOString(), '2026-10-19T00:00:00.000Z');
  assert.equal(pantryListWhere({ freshness: 'fresh' }, 'Asia/Kolkata', now).expiresOn.gte.toISOString(), '2026-10-20T00:00:00.000Z');
  assert.equal(pantryListWhere({ q: '100%_\\' }, 'UTC', now).normalizedName.contains, '100\\%\\_\\\\');
  assert.deepEqual(pantryListOrder('name'), [{ normalizedName: 'asc' }, { id: 'asc' }]);
  assert.deepEqual(pantryListOrder('expiry').at(-1), { id: 'asc' });
});
test('filtered list HTTP contract authenticates before query work and passes only validated server criteria', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity, pantryService: { list: async (user, page, filters) => {
    calls++; assert.equal(user.id, identity.id); assert.equal(page.page, 2);
    assert.deepEqual(filters, { q: 'milk', category: 'DAIRY', sort: 'name' });
    return { items: [], pagination: page, inventory: { active: 8, categories: { DAIRY: 2 } } };
  } } });
  const path = '/api/v1/pantry?q=Milk&category=DAIRY&sort=name&page=2';
  assert.equal((await request(app).get(path)).status, 401);
  assert.equal((await request(app).get(path + '&q=other').set('Authorization', 'Bearer a.b.c')).status, 400);
  const result = await request(app).get(path).set('Authorization', 'Bearer a.b.c');
  assert.equal(result.status, 200); assert.equal(result.body.data.inventory.active, 8); assert.equal(calls, 1);
});

const { categoryPageWindows } = require('../dist/lib/pantryQuery.js');
test('alphabetic category paging spans group boundaries and preserves offsets despite enum declaration order', () => {
  const groups = [{ category: 'PRODUCE', count: 2 }, { category: 'DAIRY', count: 3 }, { category: 'BAKERY', count: 1 }];
  assert.deepEqual(categoryPageWindows(groups, 0, 2), [{ category: 'BAKERY', skip: 0, take: 1 }, { category: 'DAIRY', skip: 0, take: 1 }]);
  assert.deepEqual(categoryPageWindows(groups, 3, 2), [{ category: 'DAIRY', skip: 2, take: 1 }, { category: 'PRODUCE', skip: 0, take: 1 }]);
  assert.deepEqual(categoryPageWindows(groups, 6, 2), []);
});
