const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma, PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { analyticsGroupsQuery, analyticsSummary } = require('../dist/lib/analytics');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
after(() => db.$disconnect());
const household = '11111111-1111-4111-8111-111111111111', foreign = '22222222-2222-4222-8222-222222222222';
const subject = 'freshtrack-dev-test:analytics:read-only';
const asOf = new Date('2026-12-01T00:00:00Z');
let sequence = 0;
const event = (item, at, status, cost = 6050, options = {}) => ({ id: String(++sequence).padStart(5, '0'), item, at, status, cost,
  household, previous: 'ACTIVE', type: 'STATUS_CHANGED', provenance: cost === null ? 'UNKNOWN' : 'PURCHASE', currency: 'INR', timezone: 'Asia/Kolkata', expiry: '2026-10-31', source: 'APP', ...options });
async function read(rows, month = '2026-10', timezone = 'Asia/Kolkata', account = subject) {
  // CTEs shadow the application tables: exact production aggregate, synthetic VALUES only.
  // No application records are read, inserted, updated or deleted; no cleanup is required.
  const values = rows.map(r => Prisma.sql`(${r.id}::text, ${r.item}::text, ${r.household}::uuid, ${new Date(r.at)}::timestamptz,
    ${r.status}::text, ${r.previous}::text, ${r.type}::text, ${r.cost}::integer, ${r.provenance}::text,
    ${r.currency}::text, ${r.timezone}::text, ${new Date(r.expiry + 'T00:00:00Z')}::date, ${r.source}::text)`);
  const groups = await db.$queryRaw(Prisma.sql`WITH "HouseholdMember" AS (SELECT ${household}::uuid AS "householdId", ${subject}::text AS "authSubject"),
    "PantryItemEvent" (id, "pantryItemId", "householdId", "occurredAt", "newStatus", "previousStatus", "eventType", "totalCostMinor", "costSource", "currencyCode", timezone, "expiresOn", source)
      AS (VALUES ${Prisma.join(values)}), ${analyticsGroupsQuery(household, account, month, timezone, asOf)}`);
  return analyticsSummary(groups, month, timezone, asOf.toISOString());
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
