const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');

requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw new Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } }, log: [], errorFormat: 'minimal' });
after(() => db.$disconnect());

async function scenario(run) {
  const rollback = new Error('ROLLBACK_TEST_FIXTURES');
  try {
    await db.$transaction(async tx => {
      const a = await tx.household.create({ data: { name: 'Integration fixture A' } });
      const b = await tx.household.create({ data: { name: 'Integration fixture B' } });
      const member = await tx.householdMember.create({ data: { householdId: a.id, authSubject: `freshtrack-dev-test:${randomUUID()}` } });
      const data = { householdId: a.id, name: 'Integration milk', normalizedName: 'integration milk', quantity: '0.5',
        unit: 'l', expiresOn: new Date('2026-10-20T00:00:00Z'), expirySource: 'USER_ENTERED', totalCostMinor: 6050, costSource: 'PURCHASE' };
      const item = await tx.pantryItem.create({ data });
      const event = { householdId: a.id, pantryItemId: item.id, eventType: 'CREATED', previousStatus: null,
        newStatus: 'ACTIVE', quantity: item.quantity, totalCostMinor: item.totalCostMinor, costSource: item.costSource,
        currencyCode: item.currencyCode, category: item.category, expiresOn: item.expiresOn, timezone: a.timezone };
      await run(tx, { a, b, member, data, item, event });
      throw rollback;
    }, { maxWait: 10000, timeout: 30000 });
  } catch (error) {
    // Do not relay database errors with query/connection details through test reports.
    if (error?.name === 'AssertionError') throw error;
    if (error !== rollback) throw new Error('DATABASE_SCENARIO_FAILED');
  }
}

async function rejectsWrite(run, expectedCode, constraint) {
  let code, detail;
  try { await run(); } catch (error) {
    detail = String(error.meta?.database_error || error.message || '');
    // Prisma 5 exposes PostgreSQL CHECK violations as UnknownRequestError/23514.
    code = error.code || (detail.includes('23514') ? 'P2004' : undefined);
  }
  assert.equal(code, expectedCode);
  if (constraint) assert.ok(detail.includes(constraint), 'Expected named SQL constraint rejection');
}

test('migrated schema stores decimal quantity, paise, date-only expiry and default preferences', async () => {
  await scenario(async (tx, { a, member, item }) => {
    assert.equal(a.currencyCode, 'INR');
    assert.equal(a.timezone, 'Asia/Kolkata');
    assert.equal(item.quantity.toString(), '0.5');
    assert.equal(item.totalCostMinor, 6050);
    assert.equal(item.expiresOn.toISOString(), '2026-10-20T00:00:00.000Z');
    const preference = await tx.userPreference.create({ data: { authSubject: member.authSubject } });
    assert.equal(preference.preferredNotificationTime, '18:30');
    assert.equal(preference.notificationEnabled, false);
  });
});

for (const [name, change, constraint] of [
  ['zero quantity', { quantity: '0' }, 'PantryItem_quantity_positive'],
  ['negative price', { totalCostMinor: -1 }, 'PantryItem_cost_nonnegative'],
  ['unknown price with value', { costSource: 'UNKNOWN' }, 'PantryItem_cost_provenance'],
  ['estimate without preset', { expirySource: 'PRESET_ESTIMATE' }, 'PantryItem_preset_valid'],
  ['blank name', { name: '  ' }, 'PantryItem_name_unit_nonempty'],
  ['unsupported currency', { currencyCode: 'USD' }, 'PantryItem_currency_supported'],
  ['wasted without timestamp', { status: 'WASTED' }, 'PantryItem_status_timestamps'],
]) test(`SQL rejects ${name}`, async () => {
  await scenario(async (tx, { data }) => rejectsWrite(() => tx.pantryItem.create({ data: { ...data, ...change } }), 'P2004', constraint));
});

test('SQL rejects invalid reminder time', async () => {
  await scenario(async (tx, { member }) => rejectsWrite(() => tx.userPreference.create({ data: {
    authSubject: member.authSubject, preferredNotificationTime: '25:99',
  } }), 'P2004', 'UserPreference_reminder_time'));
});

test('event cannot point to another household’s item', async () => {
  await scenario(async (tx, { b, event }) => rejectsWrite(() => tx.pantryItemEvent.create({ data: { ...event, householdId: b.id } }), 'P2003'));
});

test('receipt creator must be a member of its household', async () => {
  await scenario(async (tx, { b, member }) => rejectsWrite(() => tx.receiptScan.create({ data: {
    householdId: b.id, createdByAuthSubject: member.authSubject,
  } }), 'P2003'));
});

test('receipt-linked item must belong to the receipt household', async () => {
  await scenario(async (tx, { b, member, data }) => {
    const receipt = await tx.receiptScan.create({ data: { householdId: data.householdId, createdByAuthSubject: member.authSubject } });
    await rejectsWrite(() => tx.pantryItem.create({ data: { ...data, householdId: b.id, receiptScanId: receipt.id, source: 'RECEIPT' } }), 'P2003');
  });
});

test('household idempotency keys cannot duplicate history', async () => {
  await scenario(async (tx, { event }) => {
    await tx.pantryItemEvent.create({ data: { ...event, idempotencyKey: 'integration:created' } });
    await rejectsWrite(() => tx.pantryItemEvent.create({ data: { ...event, idempotencyKey: 'integration:created' } }), 'P2002');
  });
});

test('failed event write can roll back its paired item status change', async () => {
  await scenario(async (tx, { item, event }) => {
    await tx.$executeRawUnsafe('SAVEPOINT outcome_test');
    await tx.pantryItem.update({ where: { id: item.id }, data: { status: 'WASTED', wastedAt: new Date() } });
    await rejectsWrite(() => tx.pantryItemEvent.create({ data: { ...event, eventType: 'STATUS_CHANGED',
      previousStatus: 'ACTIVE', newStatus: 'WASTED', totalCostMinor: -1 } }), 'P2004', 'PantryItemEvent_cost_nonnegative');
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT outcome_test');
    assert.equal((await tx.pantryItem.findUniqueOrThrow({ where: { id: item.id } })).status, 'ACTIVE');
    assert.equal(await tx.pantryItemEvent.count({ where: { pantryItemId: item.id } }), 0);
  });
});
