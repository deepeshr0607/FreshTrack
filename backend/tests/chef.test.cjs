const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');
const { AuthFailure } = require('../dist/services/auth.js');
const { createChefService, chefWindow, ChefFailure } = require('../dist/services/chef.js');
const identity = { id: 'chef-fixture' };
const verifyIdentity = async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; };
const now = () => new Date('2026-10-14T19:00:00Z'); // Kolkata has already entered the 15th.
const row = { id: 'fixture-item', name: '  Low-Fat   Milk  ', quantity: { toString: () => '0.500' }, unit: 'l', expiresOn: new Date('2026-10-15T00:00:00Z') };
function database(rows = [row], membership = { householdId: 'fixture-household', household: { timezone: 'Asia/Kolkata' } }) {
  const calls = {};
  const db = { $transaction: async (operation, options) => {
    calls.options = options;
    return operation({ householdMember: { findUnique: async query => { calls.member = query; return membership; } },
      pantryItem: { findMany: async query => { calls.items = query; return rows; } } });
  } };
  return { db, calls };
}
test('Chef calendar window uses household day across UTC/month/year/leap boundaries', () => {
  assert.deepEqual(chefWindow(now(), 'Asia/Kolkata'), { householdDate: '2026-10-15', throughDate: '2026-10-16', timezone: 'Asia/Kolkata', window: 'HOUSEHOLD_TODAY_AND_TOMORROW' });
  for (const [instant, today, tomorrow] of [['2026-12-31', '2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-28', '2028-02-29'], ['2026-02-28', '2026-02-28', '2026-03-01']]) {
    const result = chefWindow(new Date(instant + 'T12:00:00Z'), 'UTC');
    assert.equal(result.householdDate, today); assert.equal(result.throughDate, tomorrow);
  }
});
test('Chef queries only current membership ACTIVE/unarchived date window and returns minimal exact values', async () => {
  const { db, calls } = database();
  const result = await createChefService(db, now).expiring(identity);
  assert.deepEqual(calls.member.where, { authSubject: identity.id });
  assert.deepEqual(calls.items.where, { householdId: 'fixture-household', household: { members: { some: { authSubject: identity.id } } },
    status: 'ACTIVE', archivedAt: null, expiresOn: { gte: new Date('2026-10-15T00:00:00Z'), lte: new Date('2026-10-16T00:00:00Z') } });
  assert.equal(calls.options.isolationLevel, 'RepeatableRead');
  assert.equal(calls.items.take, 201);
  assert.deepEqual(calls.items.select, { id: true, name: true, quantity: true, unit: true, expiresOn: true });
  assert.deepEqual(result.ingredients, [{ pantryItemId: row.id, name: 'Low-Fat Milk', quantity: '0.5', unit: 'l', expiresOn: '2026-10-15' }]);
  assert.equal(JSON.stringify(result).includes('Cost'), false);
});
test('empty Chef window is valid; no membership never reads items; overflow never silently truncates', async () => {
  assert.deepEqual((await createChefService(database([]).db, now).expiring(identity)).ingredients, []);
  const absent = database([], null);
  await assert.rejects(createChefService(absent.db, now).expiring(identity), { code: 'HOUSEHOLD_REQUIRED' });
  assert.equal(absent.calls.items, undefined);
  await assert.rejects(createChefService(database(Array(201).fill(row)).db, now).expiring(identity), { code: 'CHEF_INGREDIENT_LIMIT' });
});
test('Chef fails closed on invalid identity/timezone and redacts driver failures', async () => {
  const fixture = database();
  await assert.rejects(createChefService(fixture.db, now).expiring({ id: ' ' }), AuthFailure);
  assert.equal(fixture.calls.member, undefined);
  const broken = { $transaction: async () => { throw Error('fixture-private-connection-string'); } };
  await assert.rejects(createChefService(broken, now).expiring(identity), error => error.code === 'CHEF_UNAVAILABLE' && !error.message.includes('private'));
  await assert.rejects(createChefService(database([], { householdId: 'fixture', household: { timezone: 'bad' } }).db, now).expiring(identity), { code: 'CHEF_UNAVAILABLE' });
});
test('Chef endpoint authenticates, rejects all client selectors/body and preserves no-store response', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity, chefService: { expiring: async user => { calls++; assert.equal(user.id, identity.id); return { ingredients: [] }; } } });
  assert.equal((await request(app).get('/api/v1/chef/expiring')).status, 401);
  assert.equal((await request(app).get('/api/v1/chef/expiring').set('Authorization', 'Bearer bad.bad.bad')).status, 401);
  for (const query of ['?userId=victim', '?householdId=victim', '?days=999', '?page=1', '?name=a&name=b']) {
    assert.equal((await request(app).get('/api/v1/chef/expiring' + query).set('Authorization', 'Bearer a.b.c')).status, 400);
  }
  assert.equal((await request(app).get('/api/v1/chef/expiring').set('Authorization', 'Bearer a.b.c').send({ name: 'override' })).status, 400);
  assert.equal(calls, 0);
  const res = await request(app).get('/api/v1/chef/expiring').set('Authorization', 'Bearer a.b.c').set('x-user-id', 'victim');
  assert.equal(res.status, 200); assert.equal(res.headers['cache-control'], 'no-store');
  assert.deepEqual(res.body, { data: { ingredients: [] } }); assert.equal(calls, 1);
});
test('Chef service failures have safe consistent envelopes and server request IDs', async () => {
  for (const [code, status] of [['HOUSEHOLD_REQUIRED', 409], ['CHEF_UNAVAILABLE', 503], ['CHEF_INGREDIENT_LIMIT', 503]]) {
    const app = createApp({ verifyIdentity, chefService: { expiring: async () => { throw new ChefFailure(code); } } });
    const res = await request(app).get('/api/v1/chef/expiring').set('Authorization', 'Bearer a.b.c');
    assert.equal(res.status, status); assert.equal(res.body.error.code, code);
    assert.equal(res.body.error.requestId, res.headers['x-request-id']);
  }
});
