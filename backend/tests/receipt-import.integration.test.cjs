const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createPantryService, receiptInput } = require('../dist/services/pantry.js');
const { RECEIPT_MAX_ITEMS } = require('../dist/contracts/receiptLimits.js');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const ids = [], subjects = [];
async function account() {
  const id = randomUUID(), subject = `freshtrack-dev-test:receipt:${randomUUID()}`;
  ids.push(id); subjects.push(subject); // Known before writing, including a lost fixture-create response.
  await db.household.create({ data: { id, name: 'Receipt integration fixture', currencyCode: 'INR', timezone: 'Asia/Kolkata', members: { create: { authSubject: subject } } } });
  return { id: subject, email: 'fixture@example.test', name: 'Fixture' };
}
const fields = { name: 'Receipt Test Milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20', totalCostMinor: 6050 };
const haul = (items = [fields, { ...fields, name: 'Receipt Test Bread', category: 'BAKERY', quantity: '1', unit: 'loaf', totalCostMinor: null }]) => receiptInput({ confirmed: true, items: items.map((item, index) => ({ rowId: `row-${index}`, item })) }, true);
function check(name, body) { test(name, { timeout: 60000 }, async () => { try { await body(); } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('RECEIPT_DATABASE_CHECK_FAILED'); } }); }
async function membership(user) { return db.householdMember.findUniqueOrThrow({ where: { authSubject: user.id } }); }
async function counts(user) { const { householdId } = await membership(user); return Promise.all([db.receiptScan.count({ where: { householdId } }), db.pantryItem.count({ where: { householdId } }), db.pantryItemEvent.count({ where: { householdId } })]); }
after(async () => {
  try {
    // ReceiptScan restricts deletion while linked PantryItems exist; delete only scoped fixtures.
    const scope = { id: { in: ids }, members: { some: { authSubject: { in: subjects } } } };
    const households = await db.household.findMany({ where: scope, select: { id: true } });
    const householdId = { in: households.map(row => row.id) };
    await db.$transaction(async tx => {
      await tx.pantryItem.deleteMany({ where: { householdId } });
      await tx.receiptScan.deleteMany({ where: { householdId } });
      await tx.household.deleteMany({ where: scope });
    });
    assert.equal(await db.household.count({ where: { id: { in: ids } } }), 0);
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: subjects } } }), 0);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('RECEIPT_FIXTURE_CLEANUP_FAILED'); }
  finally { await db.$disconnect(); }
});
check('review reads only the verified household and writes no receipt, item or event', async () => {
  const a = await account(), b = await account(), service = createPantryService(db);
  await service.create(b, fields, randomUUID());
  const review = await service.receiptReview(a, { items: haul().items });
  assert.ok(review.rows.every(row => row.total === 0)); assert.deepEqual(await counts(a), [0, 0, 0]);
  const pair = await service.receiptReview(a, { items: haul([fields, { ...fields, name: '  receipt   TEST milk  ' }]).items });
  assert.deepEqual(pair.rows.map(row => row.withinHaul.length), [1, 1]);
});
check('confirmed import atomically records exact values, source, receipt and CREATED snapshots; replay adds nothing', async () => {
  const user = await account(), service = createPantryService(db), input = haul(), key = randomUUID();
  const result = await service.receiptImport(user, input, key);
  assert.equal(result.replayed, false); assert.deepEqual(await counts(user), [1, 2, 2]);
  assert.ok(result.items.every(item => item.source === 'RECEIPT' && item.status === 'ACTIVE' && item.expirySource === 'USER_ENTERED'));
  const milk = result.items.find(item => item.name === fields.name); assert.equal(milk.quantity, '0.5'); assert.equal(milk.totalCostMinor, 6050);
  assert.equal(result.items.find(item => item.name !== fields.name).totalCostMinor, null);
  const receipt = await db.receiptScan.findUniqueOrThrow({ where: { id: result.receiptScanId } });
  assert.equal(receipt.status, 'IMPORTED'); assert.equal(receipt.createdByAuthSubject, user.id); assert.ok(receipt.importedAt);
  assert.equal(receipt.temporaryImageKey, null); assert.equal(receipt.detectedItems, null);
  for (const item of result.items) {
    const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: item.id } });
    assert.equal(events.length, 1); assert.equal(events[0].eventType, 'CREATED'); assert.equal(events[0].totalCostMinor, item.totalCostMinor);
  }
  const replay = await service.receiptImport(user, { ...input, items: [...input.items].reverse() }, key);
  assert.equal(replay.replayed, true); assert.equal(replay.receiptScanId, result.receiptScanId); assert.deepEqual(replay.items.map(item => item.id), result.items.map(item => item.id));
  assert.deepEqual(await counts(user), [1, 2, 2]);
});
check('concurrent first confirmations share one receipt and exact event counts; key underscores are literal', async () => {
  const user = await account(), service = createPantryService(db), input = haul(), key = `retry_${randomUUID()}`;
  const results = await Promise.all([service.receiptImport(user, input, key), service.receiptImport(user, input, key)]);
  assert.equal(results[0].receiptScanId, results[1].receiptScanId); assert.deepEqual(await counts(user), [1, 2, 2]);
  const second = await service.receiptImport(user, haul([{ ...fields, name: 'Different Milk' }]), key.replace('_', 'X'));
  assert.notEqual(second.receiptScanId, results[0].receiptScanId); assert.deepEqual(await counts(user), [2, 3, 3]);
});
check('changed payload, row count, row identity and confirmation cannot reuse an imported key', async () => {
  const user = await account(), service = createPantryService(db), input = haul(), key = randomUUID();
  await service.receiptImport(user, input, key);
  for (const altered of [haul([{ ...fields, totalCostMinor: 7200 }, input.items[1].item]), haul([fields]),
    { ...input, items: input.items.map((row, index) => ({ ...row, rowId: `changed-${index}` })) },
    { ...input, items: input.items.map(row => ({ ...row, item: { ...row.item, duplicateConfirmation: { confirmed: true, action: 'add_separately' } } })) }]) {
    await assert.rejects(service.receiptImport(user, altered, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  }
  assert.deepEqual(await counts(user), [1, 2, 2]);
});
check('existing and within-haul duplicates block the whole import unless explicitly separate; existing purchases unchanged', async () => {
  const user = await account(), service = createPantryService(db);
  const existing = await service.create(user, fields, randomUUID());
  const input = haul(), key = randomUUID();
  await assert.rejects(service.receiptImport(user, input, key), error => error.code === 'PANTRY_DUPLICATE');
  assert.deepEqual(await counts(user), [0, 1, 1]);
  const review = await service.receiptReview(user, { items: input.items });
  assert.equal(review.rows.find(row => row.rowId === 'row-0').matches[0].id, existing.id);
  const separate = { confirmed: true, action: 'add_separately' };
  const saved = await service.receiptImport(user, haul([{ ...fields, quantity: '2', totalCostMinor: 8000, duplicateConfirmation: separate }, input.items[1].item]), key);
  assert.equal(saved.items[0].quantity, '2'); assert.equal((await service.find(user, existing.id)).quantity, '0.5');
  const repeated = haul([{ ...fields, name: 'Repeated Bread' }, { ...fields, name: 'Repeated Bread' }]);
  await assert.rejects(service.receiptImport(user, repeated, randomUUID()), error => error.code === 'PANTRY_DUPLICATE');
  await service.receiptImport(user, { ...repeated, items: repeated.items.map(row => ({ ...row, item: { ...row.item, duplicateConfirmation: separate } })) }, randomUUID());
  assert.deepEqual(await counts(user), [2, 5, 5]);
});
check('second-event failure rolls back receipt and all item/history writes', async () => {
  const user = await account();
  const failing = { $transaction: (run, options) => db.$transaction(async tx => {
    let count = 0;
    return run({ householdMember: tx.householdMember, pantryItem: tx.pantryItem, receiptScan: tx.receiptScan,
      pantryItemEvent: { findMany: tx.pantryItemEvent.findMany, create: args => ++count === 2 ? Promise.reject(Error('fixture failure')) : tx.pantryItemEvent.create(args) } });
  }, options) };
  await assert.rejects(createPantryService(failing).receiptImport(user, haul(), randomUUID()), error => error.code === 'PANTRY_UNAVAILABLE');
  assert.deepEqual(await counts(user), [0, 0, 0]);
});
check('replay after an explicit outcome returns current status and does not reactivate or duplicate events', async () => {
  const user = await account(), service = createPantryService(db), input = haul(), key = randomUUID();
  const result = await service.receiptImport(user, input, key), milk = result.items[0];
  await service.outcome(user, milk.id, 'waste', { confirmed: true, expectedUpdatedAt: milk.updatedAt }, randomUUID());
  const replay = await service.receiptImport(user, input, key);
  assert.equal(replay.items[0].status, 'WASTED'); assert.deepEqual(await counts(user), [1, 2, 3]);
});
check('same request key in another household never returns the first household records', async () => {
  const a = await account(), b = await account(), service = createPantryService(db), input = haul(), key = randomUUID();
  const one = await service.receiptImport(a, input, key), two = await service.receiptImport(b, input, key);
  assert.notEqual(one.receiptScanId, two.receiptScanId); assert.ok(two.items.every(item => !one.items.some(prior => prior.id === item.id)));
  await assert.rejects(service.find(b, one.items[0].id), error => error.code === 'ITEM_NOT_FOUND');
  assert.deepEqual(await counts(a), [1, 2, 2]); assert.deepEqual(await counts(b), [1, 2, 2]);
});
check('maximum receipt haul commits once and replays without exceeding the transaction budget', async () => {
  const user = await account(), service = createPantryService(db), key = randomUUID();
  const input = haul(Array.from({ length: RECEIPT_MAX_ITEMS }, (_, index) => ({ ...fields, name: `Maximum Haul Item ${index}`, totalCostMinor: index === 0 ? 0 : index === 1 ? null : index * 100 })));
  const result = await service.receiptImport(user, input, key);
  assert.equal(result.items.length, RECEIPT_MAX_ITEMS); assert.deepEqual(await counts(user), [1, RECEIPT_MAX_ITEMS, RECEIPT_MAX_ITEMS]);
  assert.equal((await service.receiptImport(user, input, key)).replayed, true); assert.deepEqual(await counts(user), [1, RECEIPT_MAX_ITEMS, RECEIPT_MAX_ITEMS]);
  await assert.rejects(service.receiptImport(user, { ...input, items: input.items.slice(0, 20) }, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  const changed = { ...input, items: input.items.map((row, index) => index === 49 ? { ...row, item: { ...row.item, totalCostMinor: 999 } } : row) };
  await assert.rejects(service.receiptImport(user, changed, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.deepEqual(await counts(user), [1, RECEIPT_MAX_ITEMS, RECEIPT_MAX_ITEMS]);
  const duplicates = await service.receiptReview(user, { items: input.items });
  assert.equal(duplicates.rows.length, 50); assert.ok(duplicates.rows.every(row => row.total === 1 && row.matches.length === 1));
  await assert.rejects(service.receiptImport(user, input, randomUUID()), error => error.code === 'PANTRY_DUPLICATE');
  const separate = { ...input, items: input.items.map(row => ({ ...row, item: { ...row.item, duplicateConfirmation: { confirmed: true, action: 'add_separately' } } })) };
  const second = await service.receiptImport(user, separate, randomUUID());
  assert.equal(second.items.length, 50); assert.deepEqual(await counts(user), [2, 100, 100]);
});
check('last event failure rolls back a full fifty-item receipt and all CREATED history', async () => {
  const user = await account();
  const failing = { $transaction: (run, options) => db.$transaction(async tx => {
    let count = 0;
    return run({ householdMember: tx.householdMember, pantryItem: tx.pantryItem, receiptScan: tx.receiptScan,
      pantryItemEvent: { findMany: tx.pantryItemEvent.findMany, create: args => ++count === RECEIPT_MAX_ITEMS ? Promise.reject(Error('fixture failure')) : tx.pantryItemEvent.create(args) } });
  }, options) };
  const input = haul(Array.from({ length: RECEIPT_MAX_ITEMS }, (_, index) => ({ ...fields, name: `Rollback Haul Item ${index}` })));
  await assert.rejects(createPantryService(failing).receiptImport(user, input, randomUUID()), error => error.code === 'PANTRY_UNAVAILABLE');
  assert.deepEqual(await counts(user), [0, 0, 0]);
});
