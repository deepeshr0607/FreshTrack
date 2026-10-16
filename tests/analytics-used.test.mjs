import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validAnalyticsSeries, createAnalyticsApi } from '../lib/analyticsApi.ts';
import { analyticsUsedPrice, analyticsReport } from '../lib/analyticsPresentation.ts';
import { analyticsFixture } from './analytics-mobile-fixtures.mjs';
test('individual entry client validates unique identity, time/expiry eligibility, list count and financial/category coverage', async () => {
  assert.equal(validAnalyticsSeries(analyticsFixture()), true);
  for (const mutate of [data => { data.usedBeforeExpiry.items[0].pantryItemId = 'private'; }, data => { data.usedBeforeExpiry.items = []; },
    data => { data.usedBeforeExpiry.items[0].totalCostMinor = 9999; }, data => { data.usedBeforeExpiry.items[0].category = 'MEAT'; },
    data => { data.usedBeforeExpiry.items[0].expiresOn = '2026-10-14'; }, data => { data.usedBeforeExpiry.items[0].occurredAt = '2026-09-15T12:00:00.000Z'; },
    data => { data.usedBeforeExpiry.items[0].reviewable = 'true'; }, data => { delete data.usedBeforeExpiry; }]) {
    const data = analyticsFixture(); mutate(data); assert.equal(validAnalyticsSeries(data), false);
    await assert.rejects(createAnalyticsApi('https://api.example.test', async () => 'jwt', false, async () => Response.json({ data })).series(), { code: 'ANALYTICS_RESPONSE' });
  }
});
test('individual price labels distinguish unknown, estimated and zero without savings claims', () => {
  assert.equal(analyticsUsedPrice({ costSource: 'UNKNOWN', totalCostMinor: null }), 'Unknown price');
  assert.equal(analyticsUsedPrice({ costSource: 'ESTIMATE', totalCostMinor: 6050 }), 'Estimated ₹60.50');
  assert.equal(analyticsUsedPrice({ costSource: 'PURCHASE', totalCostMinor: 0 }), 'Recorded ₹0.00');
});
test('report lists current Pantry names and outcome-time date/value with explicit bounded coverage', () => {
  const report = analyticsReport(analyticsFixture());
  assert.match(report, /Latest 1 of 1 confirmed uses on\/before expiry/); assert.match(report, /current Pantry names; outcome-time values/);
  assert.match(report, /Fixture Milk: Recorded ₹72.00; used 2026-10-15/); assert.match(report, /expiry 2026-10-16/);
});

test('bounded individual lists validate subset coverage without replacing full totals and reject duplicate UUID spellings', () => {
  const data = analyticsFixture(), amount = { count: 25, purchaseCount: 25, purchaseCostMinor: '180000', estimatedCount: 0, estimatedCostMinor: '0', unknownCount: 0 };
  data.months[5].consumedBeforeOrOnExpiry = { ...amount }; data.categories.find(row => row.category === 'DAIRY').consumedBeforeOrOnExpiry = { ...amount };
  data.comparison.consumedPurchaseDeltaMinor = '180000';
  const first = data.usedBeforeExpiry.items[0]; data.usedBeforeExpiry.total = 25;
  data.usedBeforeExpiry.items = Array.from({ length: 20 }, (_, n) => ({ ...first, eventId: `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`, pantryItemId: `11111111-1111-4111-8111-${String(n + 1).padStart(12, '0')}` }));
  assert.equal(validAnalyticsSeries(data), true);
  data.usedBeforeExpiry.items[0].eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  data.usedBeforeExpiry.items[1].eventId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'; assert.equal(validAnalyticsSeries(data), false);
});
