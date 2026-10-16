const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma, PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { analyticsGroupsQuery, analyticsSummary, analyticsMonths, analyticsSeries } = require('../dist/lib/analytics');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
after(() => db.$disconnect());
const query = process.env.ANALYTICS_SQL_TRANSPORT === 'https'
  ? require('./analytics-https.cjs').createAnalyticsHttpsQuery() : sql => db.$queryRaw(sql);
const household = '11111111-1111-4111-8111-111111111111', foreign = '22222222-2222-4222-8222-222222222222';
const subject = 'freshtrack-dev-test:analytics:read-only';
const asOf = new Date('2026-12-01T00:00:00Z');
let sequence = 0;
const event = (item, at, status, cost = 6050, options = {}) => ({ id: String(++sequence).padStart(5, '0'), item, at, status, cost,
  household, category: 'OTHER', previous: 'ACTIVE', type: 'STATUS_CHANGED', provenance: cost === null ? 'UNKNOWN' : 'PURCHASE', currency: 'INR', timezone: 'Asia/Kolkata', expiry: '2026-10-31', source: 'APP', ...options });
async function read(rows, month = '2026-10', timezone = 'Asia/Kolkata', account = subject, count) {
  const months = count === undefined ? month : analyticsMonths(month, count);
  // CTEs shadow the application tables: exact production aggregate, synthetic VALUES only.
  // No application records are read, inserted, updated or deleted; no cleanup is required.
  const values = rows.map(r => Prisma.sql`(${r.id}::text, ${r.item}::text, ${r.household}::uuid, ${new Date(r.at)}::timestamptz,
    ${r.status}::text, ${r.previous}::text, ${r.type}::text, ${r.cost}::integer, ${r.provenance}::text,
    ${r.currency}::text, ${r.timezone}::text, ${new Date(r.expiry + 'T00:00:00Z')}::date, ${r.source}::text, ${r.category}::text)`);
  const groups = await query(Prisma.sql`WITH "HouseholdMember" AS (SELECT ${household}::uuid AS "householdId", ${subject}::text AS "authSubject"),
    "PantryItemEvent" (id, "pantryItemId", "householdId", "occurredAt", "newStatus", "previousStatus", "eventType", "totalCostMinor", "costSource", "currencyCode", timezone, "expiresOn", source, category)
      AS (VALUES ${Prisma.join(values)}), ${analyticsGroupsQuery(household, account, months, timezone, asOf)}`);
  return count === undefined ? analyticsSummary(groups, month, timezone, asOf.toISOString()) : analyticsSeries(groups, months, timezone, asOf.toISOString(), '2026-12');
}
test('SQL keeps authoritative entry snapshots, zero/unknown/estimated values separate and excludes foreign events', async () => {
  const rows = [event('half-litre', '2026-10-15T12:00:00Z', 'WASTED'), event('zero', '2026-10-15T12:00:00Z', 'WASTED', 0),
    event('estimate', '2026-10-15T12:00:00Z', 'WASTED', 2000, { provenance: 'ESTIMATE' }), event('unknown', '2026-10-15T12:00:00Z', 'WASTED', null),
    event('foreign', '2026-10-15T12:00:00Z', 'WASTED', 9999, { household: foreign }),
    event('half-litre', '2026-10-16T12:00:00Z', 'WASTED', 9999, { previous: 'WASTED', type: 'EDITED' })];
  const result = await read(rows);
  assert.deepEqual(result.wasted, { count: 4, purchaseCount: 2, purchaseCostMinor: '6050', estimatedCount: 1, estimatedCostMinor: '2000', unknownCount: 1 });
  assert.equal((await read(rows, '2026-10', 'Asia/Kolkata', 'foreign-account')).wasted.count, 0);
  assert.deepEqual(await read(rows), result); // Repeated reads never append or double-count.
});
test('SQL applies Undo across months and counts only reconfirmed outcomes in their new month', async () => {
  const rows = [event('one', '2026-10-15T12:00:00Z', 'WASTED'), event('one', '2026-11-01T12:00:00Z', 'ACTIVE', 6050, { previous: 'WASTED' }),
    event('two', '2026-10-15T12:00:00Z', 'WASTED'), event('two', '2026-11-02T12:00:00Z', 'ACTIVE', 6050, { previous: 'WASTED' }),
    event('two', '2026-11-03T12:00:00Z', 'CONSUMED', 7200),
    event('two', '2026-11-04T12:00:00Z', 'CONSUMED', 9999, { previous: 'CONSUMED' }),
    event('two', '2027-01-01T12:00:00Z', 'ACTIVE', 7200, { previous: 'CONSUMED' })];
  assert.equal((await read(rows)).wasted.count, 0);
  const november = await read(rows, '2026-11'); assert.equal(november.wasted.count, 0);
  assert.equal(november.consumedAfterExpiry.purchaseCostMinor, '7200'); assert.equal(november.consumedAfterExpiry.count, 1);
});
test('SQL respects Kolkata month midnight and outcome-time expiry timezone, and separates assumed/system outcomes', async () => {
  const rows = [event('before', '2026-10-31T18:29:59.999Z', 'CONSUMED'), event('after', '2026-10-31T18:30:00Z', 'CONSUMED'),
    event('assumed', '2026-10-15T12:00:00Z', 'ASSUMED_CONSUMED', 100), event('system', '2026-10-15T12:00:00Z', 'CONSUMED', 200, { source: 'SYSTEM' })];
  const october = await read(rows); assert.equal(october.consumedBeforeOrOnExpiry.count, 1); assert.equal(october.unconfirmed.purchaseCostMinor, '300');
  const november = await read(rows, '2026-11'); assert.equal(november.consumedAfterExpiry.count, 1);
  const utc = await read(rows, '2026-10', 'UTC'); assert.equal(utc.consumedAfterExpiry.count, 1); // Current zone groups month; snapshot zone classifies expiry.
});
test('SQL handles leap-day and year boundaries, empty months and totals beyond a single entry limit', async () => {
  const rows = [event('leap', '2024-02-29T18:29:59.999Z', 'WASTED'), event('march', '2024-02-29T18:30:00Z', 'WASTED'),
    event('year', '2025-12-31T18:30:00Z', 'WASTED')];
  assert.equal((await read(rows, '2024-02')).wasted.count, 1); assert.equal((await read(rows, '2024-03')).wasted.count, 1);
  assert.equal((await read(rows, '2026-01')).wasted.count, 1); assert.equal((await read(rows, '2025-12')).wasted.count, 0);
  assert.equal((await read(rows, '2023-01')).wasted.purchaseCostMinor, '0');
  const large = [event('large-one', '2026-10-15T00:00:00Z', 'WASTED', 2147483647), event('large-two', '2026-10-15T00:00:00Z', 'WASTED', 2147483647)];
  assert.equal((await read(large)).wasted.purchaseCostMinor, '4294967294');
});

test('SQL series exactly reconciles with standalone summaries after cross-month Undo and confirmation', async () => {
  const rows = [event('undone-outside-range', '2026-09-15T12:00:00Z', 'WASTED'),
    event('undone-outside-range', '2026-12-01T00:00:00Z', 'ACTIVE', 6050, { previous: 'WASTED' }),
    event('corrected', '2026-09-20T12:00:00Z', 'WASTED'), event('corrected', '2026-10-01T12:00:00Z', 'ACTIVE', 6050, { previous: 'WASTED' }),
    event('corrected', '2026-11-01T12:00:00Z', 'WASTED', 7700), event('estimate', '2026-09-15T12:00:00Z', 'WASTED', 2000, { provenance: 'ESTIMATE' }),
    event('unknown', '2026-10-15T12:00:00Z', 'WASTED', null), event('used', '2026-10-15T12:00:00Z', 'CONSUMED', 200)];
  const series = await read(rows, '2026-11', 'Asia/Kolkata', subject, 3);
  for (const point of series.months) {
    const { period, ...summary } = point;
    assert.deepEqual(summary, await read(rows, point.month)); assert.equal(period, 'COMPLETE');
  }
  assert.equal(series.months[0].wasted.purchaseCostMinor, '0'); assert.equal(series.months[0].wasted.estimatedCostMinor, '2000');
  assert.equal(series.months[1].wasted.unknownCount, 1); assert.equal(series.months[2].wasted.purchaseCostMinor, '7700');
  assert.equal(series.comparison.wastedPurchaseDeltaMinor, '7700'); assert.equal(series.comparison.consumedPurchaseDeltaMinor, '-200');
  assert.equal((await read(rows, '2026-11', 'Asia/Kolkata', 'foreign-account', 3)).months.every(point => point.wasted.count === 0), true);
});
test('SQL series month grouping respects a DST-observing household without device timezone arithmetic', async () => {
  const rows = [event('october', '2026-11-01T03:59:59.999Z', 'WASTED', 100), event('november', '2026-11-01T04:00:00Z', 'WASTED', 200)];
  const ny = await read(rows, '2026-11', 'America/New_York', subject, 2);
  assert.deepEqual(ny.months.map(point => point.wasted.purchaseCostMinor), ['100', '200']);
  const utc = await read(rows, '2026-11', 'UTC', subject, 2);
  assert.deepEqual(utc.months.map(point => point.wasted.purchaseCostMinor), ['0', '300']);
});

test('SQL categories preserve outcome snapshots across edits, Undo and recategorized reconfirmation', async () => {
  const rows = [event('one', '2026-10-01T12:00:00Z', 'WASTED', 6050, { category: 'DAIRY' }),
    event('one', '2026-10-02T12:00:00Z', 'WASTED', 9999, { category: 'MEAT', previous: 'WASTED', type: 'EDITED' }),
    event('two', '2026-10-01T12:00:00Z', 'WASTED', 2500, { category: 'DAIRY' }),
    event('two', '2026-11-01T12:00:00Z', 'ACTIVE', 2500, { category: 'DAIRY', previous: 'WASTED' }),
    event('two', '2026-11-02T12:00:00Z', 'WASTED', 3000, { category: 'BAKERY' }),
    event('three', '2026-10-15T12:00:00Z', 'CONSUMED', 7200, { category: 'PRODUCE' }),
    event('foreign', '2026-10-15T12:00:00Z', 'WASTED', 9999, { category: 'MEAT', household: foreign })];
  const october = await read(rows, '2026-10', 'Asia/Kolkata', subject, 2), last = october.months[1];
  assert.equal(october.categories.find(row => row.category === 'DAIRY').wasted.purchaseCostMinor, '6050');
  assert.equal(october.categories.find(row => row.category === 'MEAT').wasted.count, 0);
  assert.equal(october.categories.find(row => row.category === 'PRODUCE').consumedBeforeOrOnExpiry.purchaseCostMinor, '7200');
  for (const bucket of ['wasted', 'consumedBeforeOrOnExpiry', 'consumedAfterExpiry', 'unconfirmed']) {
    assert.equal(String(october.categories.reduce((sum, row) => sum + BigInt(row[bucket].purchaseCostMinor), 0n)), last[bucket].purchaseCostMinor);
    assert.equal(october.categories.reduce((sum, row) => sum + row[bucket].count, 0), last[bucket].count);
  }
  const november = await read(rows, '2026-11', 'Asia/Kolkata', subject, 2);
  assert.equal(november.categories.find(row => row.category === 'BAKERY').wasted.purchaseCostMinor, '3000');
  assert.equal(november.categories.find(row => row.category === 'DAIRY').wasted.count, 0);
});
test('SQL category coverage separates estimated, unknown, zero and system outcomes with empty partitions', async () => {
  const rows = [event('unknown', '2026-10-15T12:00:00Z', 'WASTED', null, { category: 'PRODUCE' }),
    event('estimate', '2026-10-15T12:00:00Z', 'WASTED', 2000, { category: 'DAIRY', provenance: 'ESTIMATE' }),
    event('zero', '2026-10-15T12:00:00Z', 'WASTED', 0, { category: 'BAKERY' }),
    event('system', '2026-10-15T12:00:00Z', 'CONSUMED', 9999, { category: 'MEAT', source: 'SYSTEM' })];
  const data = await read(rows, '2026-10', 'Asia/Kolkata', subject, 2);
  assert.equal(data.categories.find(row => row.category === 'PRODUCE').wasted.unknownCount, 1);
  assert.equal(data.categories.find(row => row.category === 'DAIRY').wasted.estimatedCostMinor, '2000');
  assert.equal(data.categories.find(row => row.category === 'BAKERY').wasted.purchaseCount, 1);
  assert.equal(data.categories.find(row => row.category === 'MEAT').unconfirmed.purchaseCostMinor, '9999');
  assert.equal(data.categories.find(row => row.category === 'MEAT').consumedBeforeOrOnExpiry.count, 0);
  const empty = await read(rows, '2026-09', 'Asia/Kolkata', subject, 2); assert.ok(empty.categories.every(row => row.wasted.count === 0));
});

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function readUsed(rows, month = '2026-10', timezone = 'Asia/Kolkata', account = subject, entries) {
  const { analyticsUsedQuery } = require('../dist/lib/analyticsUsed');
  const values = rows.map(r => Prisma.sql`(${r.id}::text, ${r.item}::text, ${r.household}::uuid, ${new Date(r.at)}::timestamptz,
    ${r.status}::text, ${r.previous}::text, ${r.type}::text, ${r.cost}::integer, ${r.provenance}::text,
    ${r.currency}::text, ${r.timezone}::text, ${new Date(r.expiry + 'T00:00:00Z')}::date, ${r.source}::text, ${r.category}::text)`);
  const items = entries ?? [...new Map(rows.map(row => [row.item, { id: row.item, household: row.household, name: 'Current Pantry Name', archived: null }])).values()];
  const names = items.map(row => Prisma.sql`(${row.id}::text, ${row.household}::uuid, ${row.name}::text, ${row.archived ? new Date(row.archived) : null}::timestamptz)`);
  return query(Prisma.sql`WITH "HouseholdMember" AS (SELECT ${household}::uuid AS "householdId", ${subject}::text AS "authSubject"),
    "PantryItemEvent" (id, "pantryItemId", "householdId", "occurredAt", "newStatus", "previousStatus", "eventType", "totalCostMinor", "costSource", "currencyCode", timezone, "expiresOn", source, category)
      AS (VALUES ${Prisma.join(values)}),
    "PantryItem" (id, "householdId", name, "archivedAt") AS (VALUES ${Prisma.join(names)}),
    ${analyticsUsedQuery(household, account, month, timezone, asOf)}`);
}
const usedEvent = (item, id, at = '2026-10-15T12:00:00Z', status = 'CONSUMED', cost = 6050, options = {}) => event(uuid(item), at, status, cost, { id: uuid(id), ...options });
test('SQL individual list excludes late/system/assumed/undone/superseded/foreign outcomes and uses immutable prices', async () => {
  const rows = [usedEvent(1, 1, undefined, undefined, 6050, { category: 'DAIRY' }),
    usedEvent(1, 2, '2026-10-16T12:00:00Z', 'CONSUMED', 9999, { type: 'EDITED', previous: 'CONSUMED', category: 'MEAT' }),
    usedEvent(2, 3, undefined, undefined, 100, { expiry: '2026-10-14' }), usedEvent(3, 4, undefined, undefined, 100, { source: 'SYSTEM' }),
    usedEvent(4, 5, undefined, 'ASSUMED_CONSUMED'), usedEvent(5, 6), usedEvent(5, 7, '2026-11-01T12:00:00Z', 'ACTIVE', 6050, { previous: 'CONSUMED' }),
    usedEvent(6, 8), usedEvent(6, 9, '2026-11-01T12:00:00Z', 'WASTED', 6050, { previous: 'CONSUMED' }),
    usedEvent(7, 10, undefined, undefined, 9999, { household: foreign }), usedEvent(8, 11, undefined, undefined, null), usedEvent(9, 12, undefined, undefined, 0)];
  const entries = [...new Map(rows.map(row => [row.item, { id: row.item, household: row.household, name: row.item === uuid(1) ? 'Current Renamed Milk' : 'Fixture', archived: row.item === uuid(8) ? '2026-11-01T00:00:00Z' : null }])).values()];
  const result = await readUsed(rows, '2026-10', 'Asia/Kolkata', subject, entries);
  assert.deepEqual(result.map(row => row.pantryItemId), [uuid(9), uuid(8), uuid(1)]);
  const milk = result.find(row => row.pantryItemId === uuid(1)); assert.equal(milk.name, 'Current Renamed Milk'); assert.equal(milk.totalCostMinor, '6050'); assert.equal(milk.category, 'DAIRY');
  assert.equal(result.find(row => row.pantryItemId === uuid(8)).reviewable, 'false'); assert.equal(result.find(row => row.pantryItemId === uuid(8)).totalCostMinor, null);
  assert.equal(result.find(row => row.pantryItemId === uuid(9)).totalCostMinor, '0');
  assert.equal((await readUsed(rows, '2026-10', 'Asia/Kolkata', 'foreign-account', entries)).length, 0);
});
test('SQL individual list caps latest rows deterministically and reconciles bounded subset with monthly totals', async () => {
  const { withAnalyticsUsedRows } = require('../dist/lib/analyticsUsed');
  const rows = Array.from({ length: 25 }, (_, n) => usedEvent(n + 1, n + 1, `2026-10-15T12:00:${String(n).padStart(2, '0')}Z`, 'CONSUMED', 100));
  const listed = await readUsed(rows); assert.equal(listed.length, 20); assert.equal(listed[0].pantryItemId, uuid(25)); assert.equal(listed[19].pantryItemId, uuid(6));
  const series = await read(rows, '2026-10', 'Asia/Kolkata', subject, 2), complete = withAnalyticsUsedRows(series, listed);
  assert.equal(complete.usedBeforeExpiry.total, 25); assert.equal(complete.usedBeforeExpiry.items.length, 20);
  assert.equal(complete.months[1].consumedBeforeOrOnExpiry.purchaseCostMinor, '2500');
});
test('SQL individual month and expiry selection use distinct household/outcome timezones and retain estimates', async () => {
  const rows = [usedEvent(1, 1, '2026-10-31T18:30:00Z', 'CONSUMED', 2000, { expiry: '2026-11-01', provenance: 'ESTIMATE' })];
  assert.equal((await readUsed(rows, '2026-10')).length, 0);
  const kolkata = await readUsed(rows, '2026-11'); assert.equal(kolkata.length, 1); assert.equal(kolkata[0].costSource, 'ESTIMATE');
  assert.equal((await readUsed(rows, '2026-10', 'UTC')).length, 1);
  assert.equal((await readUsed(rows, '2026-11', 'UTC')).length, 0);
  const mismatch = [{ id: uuid(1), household: foreign, name: 'Foreign name', archived: null }];
  assert.equal((await readUsed(rows, '2026-11', 'Asia/Kolkata', subject, mismatch)).length, 0);
});
