const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyticsSeries } = require('../dist/lib/analytics');
const groups = [
  { category: 'DAIRY', bucket: 'wasted', provenance: 'PURCHASE', count: '2', amount: '9007199254740993' },
  { category: 'PRODUCE', bucket: 'wasted', provenance: 'PURCHASE', count: '1', amount: '0' },
  { category: 'PRODUCE', bucket: 'wasted', provenance: 'UNKNOWN', count: '3', amount: '0' },
  { category: 'SNACKS', bucket: 'wasted', provenance: 'ESTIMATE', count: '1', amount: '2500' },
  { category: 'BAKERY', bucket: 'consumedBeforeOrOnExpiry', provenance: 'PURCHASE', count: '1', amount: '7000' },
  { category: 'MEAT', bucket: 'unconfirmed', provenance: 'PURCHASE', count: '1', amount: '9000' },
].map(row => ({ ...row, month: '2026-10', currency: 'INR' }));
const build = rows => analyticsSeries(rows, ['2026-09', '2026-10'], 'Asia/Kolkata', '2026-10-16T00:00:00Z', '2026-10');
test('all seven category partitions reconcile every count and exact amount to the selected month', () => {
  const data = build(groups), last = data.months[1]; assert.equal(data.categories.length, 7);
  for (const bucket of ['wasted', 'consumedBeforeOrOnExpiry', 'consumedAfterExpiry', 'unconfirmed']) {
    for (const field of ['count', 'purchaseCount', 'estimatedCount', 'unknownCount']) assert.equal(data.categories.reduce((sum, row) => sum + row[bucket][field], 0), last[bucket][field]);
    for (const field of ['purchaseCostMinor', 'estimatedCostMinor']) assert.equal(String(data.categories.reduce((sum, row) => sum + BigInt(row[bucket][field]), 0n)), last[bucket][field]);
  }
  assert.equal(data.categories.find(row => row.category === 'DAIRY').wasted.purchaseCostMinor, '9007199254740993');
  assert.equal(data.categories.find(row => row.category === 'PRODUCE').wasted.unknownCount, 3);
  assert.equal(data.categories.find(row => row.category === 'SNACKS').wasted.estimatedCostMinor, '2500');
});
test('categories use only the selected month, preserve known zero and return seven empty partitions', () => {
  const data = build([...groups, { ...groups[0], month: '2026-09', category: 'FROZEN', amount: '100' }]);
  assert.equal(data.categories.find(row => row.category === 'FROZEN').wasted.count, 0);
  assert.equal(data.categories.find(row => row.category === 'PRODUCE').wasted.purchaseCount, 1);
  const empty = build([]); assert.equal(empty.categories.length, 7); assert.ok(empty.categories.every(row => row.wasted.count === 0));
});
test('missing or unknown snapshot categories fail closed rather than dropping financial value', () => {
  for (const category of [undefined, null, '', '__proto__', 'UNSUPPORTED']) assert.throws(() => build([{ ...groups[0], category }]));
});
