const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createPantryService, pantryInput } = require('../dist/services/pantry.js');
require('../scripts/development-database.cjs').requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' }), fixtures = [];
async function account() {
  const id = randomUUID(), subject = `freshtrack-dev-test:barcode:${randomUUID()}`; fixtures.push({ id, subject });
  await db.household.create({ data: { id, name: 'Barcode integration fixture', currencyCode: 'INR', timezone: 'Asia/Kolkata', members: { create: { authSubject: subject } } } });
  return { id: subject, householdId: id };
}
after(async () => {
  try {
    const scope = { id: { in: fixtures.map(f => f.id) }, members: { some: { authSubject: { in: fixtures.map(f => f.subject) } } } };
    const count = await db.household.deleteMany({ where: scope });
    assert.equal(count.count, fixtures.length);
    assert.equal(await db.household.count({ where: { id: { in: fixtures.map(f => f.id) } } }), 0);
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: fixtures.map(f => f.subject) } } }), 0);
  } catch { throw Error('BARCODE_FIXTURE_CLEANUP_FAILED'); } finally { await db.$disconnect(); }
});
const fields = { name: 'Barcode Fixture Food', category: 'OTHER', quantity: '0.5', unit: 'bag', expiresOn: '2026-10-30', totalCostMinor: 6050, barcode: '3017620422003',
  expirySelection: { packageDate: '2026-10-30', userDate: null, preset: null } };
const check = (name, fn) => test(name, { timeout: 60000 }, async () => { try { await fn(); } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('BARCODE_DATABASE_CHECK_FAILED'); } });
check('concurrent identical saves and restart-style replay create one barcode purchase and one CREATED event', async () => {
  const user = await account(), service = createPantryService(db), input = pantryInput(fields), key = randomUUID();
  const [a, b] = await Promise.all([service.create(user, input, key), service.create(user, input, key)]);
  assert.equal(a.id, b.id); assert.equal(a.source, 'BARCODE'); assert.equal(a.barcode, '03017620422003');
  assert.equal(a.totalCostMinor, 6050); assert.equal(a.quantity, '0.5'); assert.equal(a.expirySource, 'PACKAGE_DATE');
  assert.equal((await createPantryService(db).create(user, input, key)).id, a.id);
  assert.equal(await db.pantryItem.count({ where: { householdId: user.householdId } }), 1);
  const events = await db.pantryItemEvent.findMany({ where: { householdId: user.householdId } });
  assert.equal(events.length, 1); assert.equal(events[0].eventType, 'CREATED'); assert.equal(events[0].metadata.barcode, a.barcode);
  await assert.rejects(service.create(user, { ...input, totalCostMinor: 7000 }, key), { code: 'IDEMPOTENCY_CONFLICT' });
  const { barcode, ...manual } = input; await assert.rejects(service.create(user, manual, key), { code: 'IDEMPOTENCY_CONFLICT' });
});
check('barcode duplicate review survives changed names/date/category; separate purchase preserves both values', async () => {
  const user = await account(), service = createPantryService(db), input = pantryInput(fields);
  const first = await service.create(user, input, randomUUID());
  const other = pantryInput({ ...fields, name: 'Renamed Fixture', category: 'SNACKS', expiresOn: '2026-11-02', totalCostMinor: null, expirySelection: { packageDate: null, userDate: '2026-11-02', preset: null } });
  const review = await service.duplicates(user, other); assert.equal(review.total, 1); assert.equal(review.matches[0].id, first.id);
  await assert.rejects(service.create(user, other, randomUUID()), { code: 'PANTRY_DUPLICATE' });
  assert.equal(await db.pantryItem.count({ where: { householdId: user.householdId } }), 1);
  const second = await service.create(user, { ...other, duplicateConfirmation: { confirmed: true, action: 'add_separately' } }, randomUUID());
  assert.notEqual(first.id, second.id); assert.equal(second.totalCostMinor, null); assert.equal(second.source, 'BARCODE');
  assert.equal((await service.find(user, first.id)).totalCostMinor, 6050);
  assert.equal(await db.pantryItemEvent.count({ where: { householdId: user.householdId, eventType: 'CREATED' } }), 2);
});
check('barcode matches and detail reads remain household scoped; names still catch manual purchases', async () => {
  const a = await account(), b = await account(), service = createPantryService(db), input = pantryInput(fields);
  const item = await service.create(a, input, randomUUID());
  assert.equal((await service.duplicates(b, input)).total, 0);
  await assert.rejects(service.find(b, item.id), { code: 'ITEM_NOT_FOUND' });
  const { barcode, ...manual } = input; await service.create(b, manual, randomUUID());
  assert.equal((await service.duplicates(b, input)).total, 1);
});
