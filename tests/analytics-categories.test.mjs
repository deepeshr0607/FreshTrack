import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validAnalyticsSeries, createAnalyticsApi } from '../lib/analyticsApi.ts';
import { analyticsCategoryShares, analyticsReport } from '../lib/analyticsPresentation.ts';
import { analyticsFixture } from './analytics-mobile-fixtures.mjs';
test('category shares sum to 100.0 using exact paise, stable ties and honest zero denominator', () => {
  assert.deepEqual(analyticsCategoryShares(['1', '1', '1']), [334, 333, 333]);
  assert.deepEqual(analyticsCategoryShares(['0', '0']), [null, null]);
  assert.deepEqual(analyticsCategoryShares(['0', '9007199254740993']), [0, 1000]);
  assert.deepEqual(analyticsCategoryShares(['1', '3']), [250, 750]);
  for (const values of [['-1'], ['0.5'], ['NaN']]) assert.throws(() => analyticsCategoryShares(values));
});
test('client rejects incomplete, duplicate, unknown or financially inconsistent category partitions', async () => {
  assert.equal(validAnalyticsSeries(analyticsFixture()), true);
  for (const change of [data => { data.categories.pop(); }, data => { data.categories[0].category = 'DAIRY'; },
    data => { data.categories[0].category = '__proto__'; }, data => { data.categories[0].wasted.purchaseCostMinor = '6051'; },
    data => { data.categories[0].wasted.count++; data.categories[0].wasted.unknownCount++; },
    data => { delete data.categories; }]) {
    const data = analyticsFixture(); change(data); assert.equal(validAnalyticsSeries(data), false);
    await assert.rejects(createAnalyticsApi('https://api.example.test', async () => 'jwt', false, async () => Response.json({ data })).series(), { code: 'ANALYTICS_RESPONSE' });
  }
});
test('report includes category-specific known values and unknown counts without inferred savings or mass', () => {
  const report = analyticsReport(analyticsFixture());
  assert.match(report, /Produce: consumed ₹0.00, wasted ₹60.50/); assert.match(report, /Dairy: consumed ₹72.00, wasted ₹0.00/);
  assert.match(report, /unknown-price consumed\/wasted 0\/1/); assert.equal(report.includes('kg rescued'), false);
});
