const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { analyticsMonths, analyticsSeries } = require('../dist/lib/analytics');
const { createAnalyticsService } = require('../dist/services/analytics');
const { createApp } = require('../dist/app');
const { AuthFailure } = require('../dist/services/auth');
const identity = { id: 'series-fixture', email: 'fixture@example.test', name: 'Fixture' };
const now = () => new Date('2026-09-30T18:30:00Z');
const group = (month, bucket, amount, provenance = 'PURCHASE') => ({ month, bucket, amount, provenance, currency: 'INR', count: '1' });
function fixture(groups = [], membership = { householdId: '11111111-1111-4111-8111-111111111111', household: { timezone: 'Asia/Kolkata', currencyCode: 'INR' } }) {
  const calls = { queries: 0 };
  const db = { $transaction: async (run, options) => { calls.options = options; return run({ householdMember: { findUnique: async args => { calls.member = args; return membership; } }, $queryRaw: async sql => { calls.queries++; calls.sql = sql; return groups; } }); } };
  return { db, calls };
}
test('series calendar windows span years/leap months and enforce bounded counts without date rollover', () => {
  assert.deepEqual(analyticsMonths('2026-01', 3), ['2025-11', '2025-12', '2026-01']);
  assert.deepEqual(analyticsMonths('2024-03', 2), ['2024-02', '2024-03']);
  assert.equal(analyticsMonths('9999-12', 12)[0], '9999-01');
  for (const count of [0, 1, 13, 2.5, '2', null, NaN]) assert.throws(() => analyticsMonths('2026-10', count));
  assert.throws(() => analyticsMonths('0001-01', 2)); assert.throws(() => analyticsMonths('2026-13', 2));
});
test('series fills empty months with exact zero and separates complete, month-to-date and future points', () => {
  const result = analyticsSeries([], ['2026-09', '2026-10', '2026-11'], 'Asia/Kolkata', now().toISOString(), '2026-10');
  assert.deepEqual(result.months.map(row => row.period), ['COMPLETE', 'MONTH_TO_DATE', 'FUTURE']);
  assert.deepEqual(result.months.map(row => row.wasted.purchaseCostMinor), ['0', '0', '0']);
  assert.equal(result.comparison.wastedPurchaseDeltaMinor, null); assert.equal(result.comparison.period, 'FUTURE_PERIOD'); assert.equal(result.previousMonth, '2026-10');
});
test('comparison uses signed exact purchase deltas only, leaving estimates/unknown/unconfirmed separate', () => {
  const rows = [group('2026-09', 'wasted', '9007199254740993'), group('2026-10', 'wasted', '0'), group('2026-10', 'wasted', '99999', 'ESTIMATE'),
    group('2026-10', 'wasted', '0', 'UNKNOWN'), group('2026-09', 'consumedBeforeOrOnExpiry', '100'),
    group('2026-10', 'consumedBeforeOrOnExpiry', '200'), group('2026-10', 'consumedAfterExpiry', '50'), group('2026-10', 'unconfirmed', '100000')];
  const result = analyticsSeries(rows, ['2026-09', '2026-10'], 'UTC', now().toISOString(), '2026-10');
  assert.deepEqual(result.comparison, { basis: 'PURCHASE_VALUES_ONLY', period: 'MONTH_TO_DATE', wastedPurchaseDeltaMinor: '-9007199254740993', consumedPurchaseDeltaMinor: '150' });
  assert.equal(result.months[1].wasted.estimatedCostMinor, '99999'); assert.equal(result.months[1].wasted.unknownCount, 1);
  assert.equal(result.months[1].unconfirmed.count, 1);
  for (const bad of [{ ...rows[0], month: '2025-01' }, { ...rows[0], month: undefined }]) assert.throws(() => analyticsSeries([bad], ['2026-09', '2026-10'], 'UTC', 'now', '2026-10'));
});
test('series reads one scoped coherent aggregate, with household month default and six ascending points', async () => {
  const { db, calls } = fixture([group('2026-09', 'wasted', '6050')]);
  const result = await createAnalyticsService(db, now).series(identity);
  assert.equal(result.month, '2026-10'); assert.equal(result.previousMonth, '2026-09'); assert.equal(result.months.length, 6);
  assert.equal(result.months[0].month, '2026-05'); assert.equal(result.months[5].period, 'MONTH_TO_DATE'); assert.equal(result.comparison.wastedPurchaseDeltaMinor, '-6050');
  assert.equal(calls.queries, 1); assert.equal(calls.options.isolationLevel, 'RepeatableRead'); assert.deepEqual(calls.member.where, { authSubject: identity.id });
  for (const value of ['series-fixture', '11111111-1111-4111-8111-111111111111', '2026-05', '2026-10']) assert.ok(calls.sql.values.includes(value));
  assert.equal(calls.sql.sql.includes(identity.id), false);
});
test('invalid ranges fail before database reads; absent membership and inconsistent months fail closed', async () => {
  const { db, calls } = fixture(); const service = createAnalyticsService(db, now);
  await assert.rejects(service.series(identity, '0001-01', 2)); await assert.rejects(service.series(identity, '2026-10', 13)); assert.equal(calls.member, undefined);
  await assert.rejects(createAnalyticsService(fixture([], null).db, now).series(identity), { code: 'HOUSEHOLD_REQUIRED' });
  await assert.rejects(createAnalyticsService(fixture([group('2025-01', 'wasted', '10')]).db, now).series(identity), { code: 'ANALYTICS_UNAVAILABLE' });
});
test('HTTP series rejects client identity, malformed counts, duplicated/nested selectors and bodies', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity: async token => { if (token !== 'a.b.c') throw new AuthFailure(); return identity; }, analyticsService: { series: async (user, month, count) => { calls++; assert.equal(user.id, identity.id); return { month: month ?? 'default', count: count ?? 6 }; } } });
  assert.equal((await request(app).get('/api/v1/analytics/series')).status, 401);
  for (const query of ['?months=1', '?months=13', '?months=2.5', '?months=02', '?months=', '?months=2&months=3', '?months[]=2', '?month=2026-10&month=2026-09', '?householdId=victim', '?timezone=UTC', '?month=2026-13']) {
    assert.equal((await request(app).get('/api/v1/analytics/series' + query).set('Authorization', 'Bearer a.b.c')).status, 400);
  }
  assert.equal((await request(app).get('/api/v1/analytics/series').set('Authorization', 'Bearer a.b.c').send({ months: 2 })).status, 400); assert.equal(calls, 0);
  const response = await request(app).get('/api/v1/analytics/series?month=2026-10&months=12').set('Authorization', 'Bearer a.b.c');
  assert.equal(response.status, 200); assert.equal(response.headers['cache-control'], 'no-store'); assert.deepEqual(response.body.data, { month: '2026-10', count: 12 });
  assert.equal((await request(app).get('/api/v1/analytics/series').set('Authorization', 'Bearer a.b.c')).body.data.count, 6);
});
test('summary keeps its contract and does not accept series-only months selector', async () => {
  const app = createApp({ verifyIdentity: async () => identity, analyticsService: { summary: async () => assert.fail('must not read') } });
  assert.equal((await request(app).get('/api/v1/analytics/summary?months=6').set('Authorization', 'Bearer a.b.c')).status, 400);
  const result = await createAnalyticsService(fixture().db, now).summary(identity);
  assert.equal(result.month, '2026-10'); assert.equal(result.wasted.count, 0); assert.equal(result.months, undefined);
});
