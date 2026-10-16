const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { analyticsMonth, analyticsSummary } = require('../dist/lib/analytics');
const { createAnalyticsService, AnalyticsFailure } = require('../dist/services/analytics');
const { createApp } = require('../dist/app');
const { AuthFailure } = require('../dist/services/auth');
const identity = { id: 'analytics-fixture', email: 'fixture@example.test', name: 'Fixture' };
const now = () => new Date('2026-09-30T18:30:00Z');
const group = (bucket = 'wasted', provenance = 'PURCHASE', count = '1', amount = '6050') => ({ bucket, provenance, count, amount, currency: 'INR' });
function database(groups = [], membership = { householdId: '11111111-1111-4111-8111-111111111111', household: { timezone: 'Asia/Kolkata', currencyCode: 'INR' } }) {
  const calls = {};
  return { calls, db: { $transaction: async (run, options) => { calls.options = options; return run({
    householdMember: { findUnique: async args => { calls.member = args; return membership; } },
    $queryRaw: async sql => { calls.sql = sql; return groups; },
  }); } } };
}
test('strict analytics months reject rollovers, nested/repeated forms, year zero and arbitrary selectors', () => {
  for (const value of ['2026-01', '2028-02', '9999-12', '0001-01']) assert.equal(analyticsMonth(value), value);
  for (const value of [null, {}, ['2026-10'], '0000-01', '2026-00', '2026-13', '26-01', '2026-1', '2026-10 ', '2026-10-01']) assert.throws(() => analyticsMonth(value));
});
test('summary separates purchase, estimate and unknown without rounding bigint totals or multiplying entry quantity', () => {
  const value = analyticsSummary([group(), group('wasted', 'PURCHASE', '1', '0'), group('wasted', 'ESTIMATE', '2', '9007199254740993'), group('wasted', 'UNKNOWN', '3', '0'), group('unconfirmed')], '2026-10', 'UTC', now().toISOString());
  assert.deepEqual(value.wasted, { count: 7, purchaseCount: 2, purchaseCostMinor: '6050', estimatedCount: 2, estimatedCostMinor: '9007199254740993', unknownCount: 3 });
  assert.equal(value.consumedAfterExpiry.count, 0); assert.equal(value.unconfirmed.count, 1);
  for (const bad of [{ ...group(), currency: 'USD' }, group('bogus'), group('wasted', 'UNKNOWN', '1', '20'), group('wasted', 'PURCHASE', '1', '-1'), group('wasted', 'PURCHASE', '9007199254740992')]) assert.throws(() => analyticsSummary([bad], '2026-10', 'UTC', 'now'));
});
test('service uses a coherent membership-scoped parameterized event aggregate and household default month', async () => {
  const { db, calls } = database([group()]); const result = await createAnalyticsService(db, now).summary(identity);
  assert.equal(result.month, '2026-10'); assert.equal(result.timezone, 'Asia/Kolkata'); assert.equal(result.asOf, now().toISOString());
  assert.deepEqual(calls.member.where, { authSubject: identity.id }); assert.equal(calls.options.isolationLevel, 'RepeatableRead');
  assert.ok(calls.sql.values.includes(identity.id)); assert.ok(calls.sql.values.includes('11111111-1111-4111-8111-111111111111'));
  assert.ok(calls.sql.values.includes('2026-10')); assert.match(calls.sql.sql, /HouseholdMember/); assert.match(calls.sql.sql, /DISTINCT ON/);
  assert.equal(calls.sql.sql.includes(identity.id), false); assert.equal(calls.sql.sql.includes('FROM "PantryItem"'), false);
});
test('empty month stays exact zero; missing membership and bad identities fail before aggregate access', async () => {
  assert.equal((await createAnalyticsService(database().db, now).summary(identity, '2028-02')).wasted.purchaseCostMinor, '0');
  const absent = database([], null); await assert.rejects(createAnalyticsService(absent.db, now).summary(identity), { code: 'HOUSEHOLD_REQUIRED' }); assert.equal(absent.calls.sql, undefined);
  const fixture = database(); await assert.rejects(createAnalyticsService(fixture.db, now).summary({ ...identity, id: ' ' }), AuthFailure); assert.equal(fixture.calls.member, undefined);
  await assert.rejects(createAnalyticsService(fixture.db, now).summary(identity, '2026-13')); assert.equal(fixture.calls.member, undefined);
});
test('unsupported currency/timezone, inconsistent aggregates and database failures return only a safe failure', async () => {
  for (const db of [database([], { householdId: 'fixture', household: { timezone: 'bad', currencyCode: 'INR' } }).db,
    database([], { householdId: 'fixture', household: { timezone: 'UTC', currencyCode: 'USD' } }).db,
    database([group('private')]).db, { $transaction: async () => { throw Error('secret-db-host'); } }]) {
    await assert.rejects(createAnalyticsService(db, now).summary(identity, '2026-10'), error => error.code === 'ANALYTICS_UNAVAILABLE' && !error.message.includes('secret'));
  }
});
test('HTTP summary authenticates and accepts only one valid month without body or identity overrides', async () => {
  let calls = 0; const app = createApp({ verifyIdentity: async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; }, analyticsService: { summary: async (user, month) => { calls++; assert.equal(user.id, identity.id); return { month: month ?? 'default' }; } } });
  assert.equal((await request(app).get('/api/v1/analytics/summary?month=2026-10')).status, 401);
  for (const query of ['?month=2026-13', '?month=', '?month=0000-01', '?month=2026-10&month=2026-11', '?month[]=2026-10', '?userId=victim', '?householdId=victim', '?month=2026-10&timezone=UTC']) {
    assert.equal((await request(app).get('/api/v1/analytics/summary' + query).set('Authorization', 'Bearer a.b.c')).status, 400);
  }
  assert.equal((await request(app).get('/api/v1/analytics/summary').set('Authorization', 'Bearer a.b.c').send({ month: '2026-10' })).status, 400); assert.equal(calls, 0);
  const result = await request(app).get('/api/v1/analytics/summary?month=2026-10').set('Authorization', 'Bearer a.b.c').set('x-user-id', 'victim');
  assert.equal(result.status, 200); assert.equal(result.headers['cache-control'], 'no-store'); assert.equal(result.body.data.month, '2026-10');
  assert.equal((await request(app).get('/api/v1/analytics/summary').set('Authorization', 'Bearer a.b.c')).body.data.month, 'default');
});
test('HTTP domain failures return safe envelopes with server-owned request IDs', async () => {
  for (const [code, status] of [['HOUSEHOLD_REQUIRED', 409], ['ANALYTICS_UNAVAILABLE', 503]]) {
    const app = createApp({ verifyIdentity: async () => identity, analyticsService: { summary: async () => { throw new AnalyticsFailure(code); } } });
    const result = await request(app).get('/api/v1/analytics/summary').set('Authorization', 'Bearer a.b.c');
    assert.equal(result.status, status); assert.equal(result.body.error.code, code); assert.equal(result.body.error.requestId, result.headers['x-request-id']);
  }
});
