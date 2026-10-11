const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createPantryService, pantryInput, PantryFailure } = require('../dist/services/pantry.js');
const { createHouseholdService } = require('../dist/services/households.js');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const subjects = []; const ids = [];
async function account() {
  const user = { id: `freshtrack-dev-test:pantry:${randomUUID()}`, email: 'fixture@example.test', name: 'Fixture' };
  subjects.push(user.id); const household = await createHouseholdService(db).bootstrap(user); ids.push(household.id); return user;
}
after(async () => {
  try {
    await db.household.deleteMany({ where: { id: { in: ids }, members: { some: { authSubject: { in: subjects } } } } });
    assert.equal(await db.household.count({ where: { id: { in: ids } } }), 0);
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: subjects } } }), 0);
  } finally { await db.$disconnect(); }
});
const input = pantryInput({ name: 'Acceptance milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20', totalCostMinor: 6050 });
test('create persists exact data and one snapshot event; retry/concurrent replay cannot duplicate the entry', async () => {
  try {
    const user = await account(); const service = createPantryService(db); const key = randomUUID();
    const saved = await service.create(user, input, key);
    const results = await Promise.all([service.create(user, input, key), service.create(user, input, key)]);
    assert.ok(results.every(item => item.id === saved.id));
    const freshClient = new PrismaClient({ log: [], errorFormat: 'minimal' });
    try { assert.equal((await createPantryService(freshClient).find(user, saved.id)).totalCostMinor, 6050); }
    finally { await freshClient.$disconnect(); }
    const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: saved.id } });
    assert.equal(events.length, 1); assert.equal(events[0].eventType, 'CREATED'); assert.equal(events[0].quantity.toString(), '0.5');
    assert.equal(events[0].timezone, 'Asia/Kolkata');
    await assert.rejects(service.create(user, { ...input, totalCostMinor: 7000 }, key), error => error instanceof PantryFailure && error.code === 'IDEMPOTENCY_CONFLICT');
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_PERSISTENCE_CHECK_FAILED'); }
});
test('list sorts nearest expiry, paginates, and foreign-account reads are scoped; unknown and free prices stay distinct', async () => {
  try {
    const a = await account(), b = await account(); const service = createPantryService(db);
    const later = await service.create(a, { ...input, expiresOn: '2026-10-25', totalCostMinor: null }, randomUUID());
    const sooner = await service.create(a, { ...input, expiresOn: '2026-10-15', totalCostMinor: 0 }, randomUUID());
    const first = await service.list(a, { page: 1, pageSize: 1 });
    assert.equal(first.items[0].id, sooner.id); assert.equal(first.items[0].totalCostMinor, 0);
    assert.equal(first.pagination.total, 2); assert.equal(first.pagination.hasNextPage, true);
    assert.equal((await service.list(a, { page: 2, pageSize: 1 })).items[0].id, later.id);
    assert.equal((await service.find(a, later.id)).totalCostMinor, null);
    assert.equal((await service.list(b, { page: 1, pageSize: 50 })).items.length, 0);
    await assert.rejects(service.find(b, sooner.id), error => error instanceof PantryFailure && error.code === 'ITEM_NOT_FOUND');
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_ISOLATION_CHECK_FAILED'); }
});
test('event failure rolls back the item; an account without membership cannot create groceries', async () => {
  try {
    const user = await account();
    const failing = { $transaction: (run, options) => db.$transaction(tx => run({ ...tx, householdMember: tx.householdMember,
      pantryItem: tx.pantryItem, pantryItemEvent: { findUnique: tx.pantryItemEvent.findUnique,
        create: async () => { throw Error('private-fixture-error'); } } }), options) };
    await assert.rejects(createPantryService(failing).create(user, input, randomUUID()), error => error instanceof PantryFailure && error.code === 'PANTRY_UNAVAILABLE');
    assert.equal((await createPantryService(db).list(user, { page: 1, pageSize: 50 })).pagination.total, 0);
    await assert.rejects(createPantryService(db).create({ ...user, id: 'freshtrack-dev-test:no-membership' }, input, randomUUID()),
      error => error instanceof PantryFailure && error.code === 'HOUSEHOLD_REQUIRED');
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_ROLLBACK_CHECK_FAILED'); }
});
