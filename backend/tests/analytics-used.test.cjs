const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyticsSeries } = require('../dist/lib/analytics');
const { withAnalyticsUsedRows } = require('../dist/lib/analyticsUsed');
const { createAnalyticsService } = require('../dist/services/analytics');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const asOf = '2026-10-16T12:00:00.000Z';
const group = (source = 'PURCHASE', amount = '6050', count = '1') => ({ month: '2026-10', category: 'DAIRY', bucket: 'consumedBeforeOrOnExpiry', provenance: source, currency: 'INR', count, amount });
const base = groups => analyticsSeries(groups, ['2026-09', '2026-10'], 'Asia/Kolkata', asOf, '2026-10');
const row = n => ({ eventId: uuid(n), pantryItemId: uuid(n + 100), name: 'Current Milk Name', category: 'DAIRY', totalCostMinor: '6050', costSource: 'PURCHASE', currencyCode: 'INR', occurredAt: '2026-10-15T12:00:00.000Z', expiresOn: '2026-10-16', outcomeTimezone: 'Asia/Kolkata', reviewable: 'true' });
test('individual entries retain snapshot values, current-name basis and archived review guard', () => {
  const data = withAnalyticsUsedRows(base([group()]), [{ ...row(1), reviewable: 'false' }]);
  assert.equal(data.usedBeforeExpiry.total, 1); assert.equal(data.usedBeforeExpiry.nameBasis, 'CURRENT_PANTRY_NAME');
  assert.equal(data.usedBeforeExpiry.items[0].totalCostMinor, 6050); assert.equal(data.usedBeforeExpiry.items[0].reviewable, false);
  assert.equal(withAnalyticsUsedRows(base([]), []).usedBeforeExpiry.items.length, 0);
});
test('individual entry shape/date/cost guards fail closed and exact full lists reconcile with category totals', () => {
  const fixture = base([group()]);
  for (const invalid of [{ ...row(1), pantryItemId: 'bad' }, { ...row(1), name: '' }, { ...row(1), totalCostMinor: '9999' },
    { ...row(1), category: 'MEAT' }, { ...row(1), occurredAt: '2026-09-15T12:00:00.000Z' }, { ...row(1), expiresOn: '2026-10-14' },
    { ...row(1), costSource: 'UNKNOWN' }, { ...row(1), reviewable: 'yes' }, { ...row(1), occurredAt: '2026-10-17T12:00:00.000Z' }]) assert.throws(() => withAnalyticsUsedRows(fixture, [invalid]));
  assert.throws(() => withAnalyticsUsedRows(fixture, []));
  assert.throws(() => withAnalyticsUsedRows(base([group('PURCHASE', '12100', '2')]), [row(1), row(1)]));
});
test('unknown, estimated and known-zero entries retain provenance; capped lists do not claim full value coverage', () => {
  assert.equal(withAnalyticsUsedRows(base([group('UNKNOWN', '0')]), [{ ...row(1), totalCostMinor: null, costSource: 'UNKNOWN' }]).usedBeforeExpiry.items[0].totalCostMinor, null);
  assert.equal(withAnalyticsUsedRows(base([group('PURCHASE', '0')]), [{ ...row(1), totalCostMinor: '0' }]).usedBeforeExpiry.items[0].totalCostMinor, 0);
  assert.equal(withAnalyticsUsedRows(base([group('ESTIMATE')]), [{ ...row(1), costSource: 'ESTIMATE' }]).usedBeforeExpiry.items[0].costSource, 'ESTIMATE');
  const data = withAnalyticsUsedRows(base([group('PURCHASE', '151250', '25')]), Array.from({ length: 20 }, (_, n) => row(n + 1)));
  assert.equal(data.usedBeforeExpiry.items.length, 20); assert.equal(data.usedBeforeExpiry.total, 25);
});
test('service reads summary and bounded scoped entries in the same RepeatableRead transaction and rejects inconsistent results', async () => {
  const identity = { id: 'used-fixture' }; let queries = [], transactions = 0;
  const db = { $transaction: async (run, options) => { transactions++; assert.equal(options.isolationLevel, 'RepeatableRead'); return run({
    householdMember: { findUnique: async args => { assert.equal(args.where.authSubject, identity.id); return { householdId: uuid(999), household: { timezone: 'Asia/Kolkata', currencyCode: 'INR' } }; } },
    $queryRaw: async sql => { queries.push(sql); return queries.length === 1 ? [group()] : [row(1)]; },
  }); } };
  const result = await createAnalyticsService(db, () => new Date(asOf)).series(identity, '2026-10', 2);
  assert.equal(transactions, 1); assert.equal(queries.length, 2); assert.equal(result.usedBeforeExpiry.items[0].name, 'Current Milk Name');
  assert.match(queries[1].sql, /LIMIT 20/); assert.ok(queries[1].values.includes(identity.id)); assert.ok(queries[1].values.includes(uuid(999)));
  assert.match(queries[1].sql, /p\."householdId" = e\."householdId"/); assert.equal(queries[1].sql.includes(identity.id), false);
});
