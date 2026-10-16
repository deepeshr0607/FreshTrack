import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsApi, validAnalyticsSeries } from '../lib/analyticsApi.ts';
import { createAnalyticsSession } from '../lib/analyticsSession.ts';
import { formatAnalyticsMoney, consumedAmount, analyticsBarPercent, analyticsReport, shiftAnalyticsMonth } from '../lib/analyticsPresentation.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';
import { analyticsFixture } from './analytics-mobile-fixtures.mjs';
test('analytics money and chart ratios retain exact paise beyond JS safe integers and represent zero truthfully', () => {
  assert.equal(formatAnalyticsMoney('6050'), '₹60.50'); assert.equal(formatAnalyticsMoney('-1'), '−₹0.01'); assert.equal(formatAnalyticsMoney('0'), '₹0.00');
  assert.equal(formatAnalyticsMoney('9007199254740993'), '₹90,071,992,547,409.93');
  assert.equal(analyticsBarPercent('0', '0'), 0); assert.equal(analyticsBarPercent('1', '4'), 25);
  for (const value of ['NaN', '1.5', '₹3', '', '001']) assert.throws(() => formatAnalyticsMoney(value));
});
test('month navigation handles leap/year boundaries and rejects unsupported keys', () => {
  assert.equal(shiftAnalyticsMonth('2026-01', -1), '2025-12'); assert.equal(shiftAnalyticsMonth('2024-02', 1), '2024-03');
  assert.equal(shiftAnalyticsMonth('0001-01', -1), null); assert.equal(shiftAnalyticsMonth('9999-12', 1), null); assert.equal(shiftAnalyticsMonth('bad', 1), null);
});
test('series validation checks six contiguous scoped month points, price coverage, periods and exact deltas', () => {
  const data = analyticsFixture(); assert.equal(validAnalyticsSeries(data), true); assert.equal(validAnalyticsSeries(data, '2026-10'), true); assert.equal(validAnalyticsSeries(data, '2026-09'), false);
  for (const change of [data => { data.months.reverse(); }, data => { data.months[5].wasted.count = 99; }, data => { data.months[5].timezone = 'UTC'; },
    data => { data.months[5].period = 'COMPLETE'; }, data => { data.comparison.wastedPurchaseDeltaMinor = '999'; }, data => { data.months[5].wasted.purchaseCostMinor = 6050; },
    data => { data.months[0].wasted.purchaseCostMinor = '100'; }, data => { data.timezone = 'not-a-zone'; }, data => { data.months[0].asOf = 'private'; }]) {
    const malformed = analyticsFixture(); change(malformed); assert.equal(validAnalyticsSeries(malformed), false);
  }
});
test('analytics client uses one authenticated backend GET with no provider keys, body or cookies', async () => {
  const calls = []; const api = createAnalyticsApi('https://api.example.test', async () => 'jwt', false, async (url, options) => { calls.push([url, options]); return Response.json({ data: analyticsFixture() }); });
  await api.series(); await api.series('2026-10');
  assert.equal(calls[0][0], 'https://api.example.test/api/v1/analytics/series?months=6'); assert.match(calls[1][0], /&month=2026-10$/);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer jwt'); assert.equal(calls[0][1].body, undefined); assert.equal(calls[0][1].credentials, 'omit'); assert.equal(calls[0][1].redirect, 'error');
  await assert.rejects(api.series('2026-13'), { code: 'ANALYTICS_MONTH' }); await assert.rejects(api.series('0001-01'), { code: 'ANALYTICS_MONTH' }); assert.equal(calls.length, 2);
});
test('analytics client rejects mismatched totals and redacts network/server bodies with fixed recovery messages', async () => {
  for (const [fetcher, code] of [[async () => { throw Error('private-credential'); }, 'ANALYTICS_NETWORK'],
    [async () => Response.json({ error: { code: 'PRIVATE_SECRET', message: 'private-credential' } }, { status: 503 }), 'ANALYTICS_UNAVAILABLE'],
    [async () => Response.json({ error: {} }, { status: 401 }), 'ANALYTICS_UNAUTHORIZED'], [async () => Response.json({ data: {} }), 'ANALYTICS_RESPONSE']]) {
    await assert.rejects(createAnalyticsApi('https://api.example.test', async () => 'jwt', false, fetcher).series(), error => error.code === code && !error.message.includes('private'));
  }
});
test('session coalesces duplicate refreshes and publishes only the latest selected month', async () => {
  const pending = new Map(); let calls = 0;
  const store = createAnalyticsSession({ series: async month => { calls++; return new Promise(resolve => pending.set(month, resolve)); } }, () => true);
  const first = store.load('2026-09'); await store.load('2026-09'); assert.equal(calls, 1);
  const second = store.load('2026-10'); pending.get('2026-10')(analyticsFixture()); await second;
  pending.get('2026-09')({ ...analyticsFixture(), month: '2026-09' }); await first;
  assert.equal(store.getSnapshot().data.month, '2026-10'); assert.equal(store.getSnapshot().month, '2026-10');
});
test('auth invalidation discards late responses and clears values while preserving only same-account month choice', async () => {
  let release, active = true; const store = createAnalyticsSession({ series: async () => new Promise(resolve => { release = resolve; }) }, () => active);
  const pending = store.load('2026-10'); active = false; store.invalidate(); release(analyticsFixture()); await pending;
  assert.equal(store.getSnapshot().data, null); assert.equal(store.getSnapshot().status, 'idle'); assert.equal(store.getSnapshot().month, '2026-10');
  await store.load(); assert.equal(store.getSnapshot().status, 'idle');
  const other = createAnalyticsSession({ series: async () => analyticsFixture() }, () => true); assert.equal(other.getSnapshot().month, undefined); assert.equal(other.getSnapshot().data, null);
});
test('failure clears prior values, retries recover and Current resets to the authoritative household month', async () => {
  let fail = false, requested; const store = createAnalyticsSession({ series: async month => { requested = month; if (fail) throw new NeonAuthError('ANALYTICS_NETWORK', 'Retry.'); return analyticsFixture(); } }, () => true);
  await store.load('2026-10'); assert.equal(store.getSnapshot().status, 'ready'); fail = true; await store.load();
  assert.equal(store.getSnapshot().data, null); assert.equal(store.getSnapshot().status, 'error'); assert.match(store.getSnapshot().error, /ANALYTICS_NETWORK/);
  fail = false; store.current(); await store.load(); assert.equal(requested, undefined); assert.equal(store.getSnapshot().status, 'ready');
});
test('empty-month data remains a valid ready result rather than fallback mock analytics', async () => {
  const data = analyticsFixture(); data.months.forEach(row => { for (const key of ['wasted', 'consumedBeforeOrOnExpiry', 'consumedAfterExpiry', 'unconfirmed']) row[key] = { count: 0, purchaseCount: 0, purchaseCostMinor: '0', estimatedCount: 0, estimatedCostMinor: '0', unknownCount: 0 }; });
  data.categories.forEach(row => { for (const key of ['wasted', 'consumedBeforeOrOnExpiry', 'consumedAfterExpiry', 'unconfirmed']) row[key] = { count: 0, purchaseCount: 0, purchaseCostMinor: '0', estimatedCount: 0, estimatedCostMinor: '0', unknownCount: 0 }; });
  data.usedBeforeExpiry = { total: 0, nameBasis: 'CURRENT_PANTRY_NAME', items: [] };
  data.comparison.wastedPurchaseDeltaMinor = '0'; data.comparison.consumedPurchaseDeltaMinor = '0'; assert.equal(validAnalyticsSeries(data), true);
  const store = createAnalyticsSession({ series: async () => data }, () => true); await store.load(); assert.equal(store.getSnapshot().status, 'ready'); assert.equal(store.getSnapshot().data.months[5].wasted.count, 0);
});
test('report uses verified values, unknown coverage, period warning and outcome provenance without fabricated savings', () => {
  const data = analyticsFixture(), report = analyticsReport(data);
  assert.equal(consumedAmount(data.months[5]).purchaseCostMinor, '7200'); assert.match(report, /₹72.00/); assert.match(report, /₹60.50/);
  assert.match(report, /Unknown-price consumed\/wasted entries: 0 \/ 1/); assert.match(report, /month-to-date totals/); assert.match(report, /Latest effective outcomes/);
  assert.equal(report.includes('$84.50'), false); assert.equal(report.includes('CO₂ Prevented'), false);
});
