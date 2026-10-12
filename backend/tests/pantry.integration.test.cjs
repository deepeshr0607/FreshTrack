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
  } catch (error) {
    if (error.name === 'AssertionError') throw error;
    throw Error('PANTRY_FIXTURE_CLEANUP_FAILED');
  } finally { await db.$disconnect(); }
});
test('batch outcome and undo are atomic, replay-safe and preserve original history', async () => {
  try {
    const user = await account(); const service = createPantryService(db);
    const items = await Promise.all([service.create(user, input, randomUUID()), service.create(user, { ...input, totalCostMinor: null }, randomUUID())]);
    const selected = { confirmed: true, items: items.map(item => ({ id: item.id, expectedUpdatedAt: item.updatedAt })) };
    const key = randomUUID();
    const changed = await service.batch(user, selected, 'waste', key);
    assert.ok(changed.every(item => item.status === 'WASTED'));
    assert.equal((await service.list(user, { page: 1, pageSize: 50 })).pagination.total, 0);
    await service.batch(user, { ...selected, items: [...selected.items].reverse() }, 'waste', key);
    await assert.rejects(service.batch(user, selected, 'consume', key), error => error.code === 'IDEMPOTENCY_CONFLICT');
    const undoInput = { confirmed: true, items: changed.map(item => ({ id: item.id, expectedUpdatedAt: item.updatedAt })) };
    const undoKey = randomUUID(); const restored = await service.batch(user, undoInput, 'restore', undoKey);
    await service.batch(user, undoInput, 'restore', undoKey);
    assert.ok(restored.every(item => item.status === 'ACTIVE'));
    assert.equal((await service.list(user, { page: 1, pageSize: 50 })).pagination.total, 2);
    for (const original of items) {
      const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: original.id }, orderBy: { occurredAt: 'asc' } });
      assert.equal(events.length, 3); assert.equal(events[1].newStatus, 'WASTED'); assert.equal(events[2].previousStatus, 'WASTED'); assert.equal(events[2].newStatus, 'ACTIVE');
      const row = await db.pantryItem.findUniqueOrThrow({ where: { id: original.id } }); assert.equal(row.wastedAt, null); assert.equal(row.consumedAt, null);
    }
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_BATCH_CHECK_FAILED'); }
});
test('foreign, stale or already-resolved batch entry rejects the whole batch', async () => {
  try {
    const a = await account(), b = await account(); const service = createPantryService(db);
    const first = await service.create(a, input, randomUUID()), second = await service.create(a, input, randomUUID()), foreign = await service.create(b, input, randomUUID());
    const ref = item => ({ id: item.id, expectedUpdatedAt: item.updatedAt });
    await assert.rejects(service.batch(a, { confirmed: true, items: [ref(first), ref(foreign)] }, 'consume', randomUUID()), error => error.code === 'ITEM_NOT_FOUND');
    await service.edit(a, second.id, { ...input, name: 'Changed item', expectedUpdatedAt: second.updatedAt }, randomUUID());
    await assert.rejects(service.batch(a, { confirmed: true, items: [ref(first), ref(second)] }, 'consume', randomUUID()), error => error.code === 'ITEM_CHANGED');
    assert.equal((await service.find(a, first.id)).status, 'ACTIVE');
    const latest = await service.find(a, second.id); await service.outcome(a, second.id, 'waste', { confirmed: true, expectedUpdatedAt: latest.updatedAt }, randomUUID());
    await assert.rejects(service.batch(a, { confirmed: true, items: [ref(first), ref(latest)] }, 'consume', randomUUID()), error => error.code === 'ITEM_RESOLVED');
    assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: first.id } }), 1);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_BATCH_ISOLATION_CHECK_FAILED'); }
});
test('failure on the second batch event rolls back every item and event', async () => {
  try {
    const user = await account(); const service = createPantryService(db);
    const items = [await service.create(user, input, randomUUID()), await service.create(user, input, randomUUID())];
    const failing = { $transaction: (run, options) => db.$transaction(async tx => {
      let count = 0; return run({ ...tx, householdMember: tx.householdMember, pantryItem: tx.pantryItem,
        pantryItemEvent: { findMany: tx.pantryItemEvent.findMany, create: args => ++count === 2 ? Promise.reject(Error('private-fixture-error')) : tx.pantryItemEvent.create(args) } });
    }, options) };
    await assert.rejects(createPantryService(failing).batch(user, { confirmed: true, items: items.map(item => ({ id: item.id, expectedUpdatedAt: item.updatedAt })) },
      'consume', randomUUID()), error => error.code === 'PANTRY_UNAVAILABLE');
    for (const item of items) { assert.equal((await service.find(user, item.id)).status, 'ACTIVE'); assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: item.id } }), 1); }
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_BATCH_ROLLBACK_CHECK_FAILED'); }
});
test('single undo is scoped, replay-safe, and cannot reverse a newer outcome', async () => {
  try {
    const user = await account(), other = await account(); const service = createPantryService(db); const original = await service.create(user, input, randomUUID());
    const consumed = await service.outcome(user, original.id, 'consume', { confirmed: true, expectedUpdatedAt: original.updatedAt }, randomUUID());
    const undoInput = { confirmed: true, expectedUpdatedAt: consumed.updatedAt }; const key = randomUUID();
    await assert.rejects(service.undo(other, original.id, undoInput, randomUUID()), error => error.code === 'ITEM_NOT_FOUND');
    const restored = await service.undo(user, original.id, undoInput, key); await service.undo(user, original.id, undoInput, key);
    assert.equal(restored.status, 'ACTIVE');
    const wasted = await service.outcome(user, original.id, 'waste', { confirmed: true, expectedUpdatedAt: restored.updatedAt }, randomUUID());
    await assert.rejects(service.undo(user, original.id, undoInput, randomUUID()), error => error.code === 'ITEM_CHANGED');
    // Replaying an older undo key returns current state rather than reversing the subsequent waste.
    assert.equal((await service.undo(user, original.id, undoInput, key)).status, 'WASTED');
    assert.equal((await service.find(user, original.id)).updatedAt, wasted.updatedAt);
    assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: original.id } }), 4);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_UNDO_CHECK_FAILED'); }
});
test('edit persists new exact fields with immutable history; stale edits and foreign writes fail', async () => {
  try {
    const a = await account(), b = await account(); const service = createPantryService(db);
    const original = await service.create(a, input, randomUUID());
    const editedInput = { ...input, name: 'Edited milk', quantity: '0.75', totalCostMinor: 7200, expiresOn: '2026-10-18', expectedUpdatedAt: original.updatedAt };
    const key = randomUUID(); const edited = await service.edit(a, original.id, editedInput, key);
    assert.equal(edited.quantity, '0.75'); assert.equal(edited.totalCostMinor, 7200); assert.notEqual(edited.updatedAt, original.updatedAt);
    assert.equal((await service.edit(a, original.id, editedInput, key)).updatedAt, edited.updatedAt);
    await assert.rejects(service.edit(a, original.id, { ...editedInput, totalCostMinor: 7300 }, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
    await assert.rejects(service.edit(a, original.id, editedInput, randomUUID()), error => error.code === 'ITEM_CHANGED');
    await assert.rejects(service.edit(b, original.id, { ...editedInput, expectedUpdatedAt: edited.updatedAt }, randomUUID()), error => error.code === 'ITEM_NOT_FOUND');
    const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: original.id }, orderBy: { occurredAt: 'asc' } });
    assert.equal(events.length, 2); assert.equal(events[0].totalCostMinor, 6050); assert.equal(events[0].quantity.toString(), '0.5');
    assert.equal(events[1].eventType, 'EDITED'); assert.equal(events[1].totalCostMinor, 7200); assert.equal(events[1].previousStatus, 'ACTIVE');
    assert.equal((await service.find(a, original.id)).name, 'Edited milk');
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_EDIT_CHECK_FAILED'); }
});
test('editing another field preserves expiry/cost provenance; explicit date change records user-entered expiry', async () => {
  try {
    const user = await account(); const service = createPantryService(db); const original = await service.create(user, input, randomUUID());
    const row = await db.pantryItem.update({ where: { id: original.id }, data: { expirySource: 'PACKAGE_DATE', freshnessPresetDays: 5, costSource: 'ESTIMATE' } });
    const changedName = await service.edit(user, row.id, { ...input, name: 'New label', expectedUpdatedAt: row.updatedAt.toISOString() }, randomUUID());
    assert.equal(changedName.expirySource, 'PACKAGE_DATE');
    assert.equal((await db.pantryItem.findUniqueOrThrow({ where: { id: row.id } })).costSource, 'ESTIMATE');
    const changedDate = await service.edit(user, row.id, { ...input, name: 'New label', expiresOn: '2026-10-22', expectedUpdatedAt: changedName.updatedAt }, randomUUID());
    assert.equal(changedDate.expirySource, 'USER_ENTERED');
    assert.equal((await db.pantryItem.findUniqueOrThrow({ where: { id: row.id } })).freshnessPresetDays, null);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_PROVENANCE_CHECK_FAILED'); }
});
test('Used/Wasted outcomes persist timestamps and snapshots; replay and conflicting confirmations add no duplicate events', async () => {
  try {
    const a = await account(), b = await account(); const service = createPantryService(db);
    for (const action of ['consume', 'waste']) {
      const original = await service.create(a, input, randomUUID());
      const confirmed = { confirmed: true, expectedUpdatedAt: original.updatedAt }; const key = randomUUID();
      await assert.rejects(service.outcome(b, original.id, action, confirmed, randomUUID()), error => error.code === 'ITEM_NOT_FOUND');
      const results = await Promise.all([service.outcome(a, original.id, action, confirmed, key), service.outcome(a, original.id, action, confirmed, key)]);
      const target = action === 'consume' ? 'CONSUMED' : 'WASTED'; assert.ok(results.every(item => item.status === target));
      await service.outcome(a, original.id, action, confirmed, randomUUID());
      await assert.rejects(service.outcome(a, original.id, action === 'consume' ? 'waste' : 'consume', confirmed, randomUUID()), error => error.code === 'ITEM_RESOLVED');
      const row = await db.pantryItem.findUniqueOrThrow({ where: { id: original.id } });
      assert.ok(action === 'consume' ? row.consumedAt : row.wastedAt);
      const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: original.id } });
      assert.equal(events.length, 2); assert.equal(events.find(event => event.eventType === 'STATUS_CHANGED').newStatus, target);
      assert.equal((await service.find(a, original.id)).status, target);
    }
    assert.equal((await service.list(a, { page: 1, pageSize: 50 })).items.length, 0);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_OUTCOME_CHECK_FAILED'); }
});
test('failed mutation event rolls back edits and status; stale confirmation cannot resolve a changed entry', async () => {
  try {
    const user = await account(); const service = createPantryService(db); const original = await service.create(user, input, randomUUID());
    const failing = { $transaction: (run, options) => db.$transaction(tx => run({ ...tx, householdMember: tx.householdMember,
      pantryItem: tx.pantryItem, pantryItemEvent: { findUnique: tx.pantryItemEvent.findUnique, create: async () => { throw Error('private-fixture-error'); } } }), options) };
    const broken = createPantryService(failing);
    await assert.rejects(broken.edit(user, original.id, { ...input, name: 'Should roll back', expectedUpdatedAt: original.updatedAt }, randomUUID()), error => error.code === 'PANTRY_UNAVAILABLE');
    await assert.rejects(broken.outcome(user, original.id, 'waste', { confirmed: true, expectedUpdatedAt: original.updatedAt }, randomUUID()), error => error.code === 'PANTRY_UNAVAILABLE');
    const unchanged = await service.find(user, original.id); assert.equal(unchanged.updatedAt, original.updatedAt); assert.equal(unchanged.status, 'ACTIVE');
    assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: original.id } }), 1);
    const updated = await service.edit(user, original.id, { ...input, quantity: '1', expectedUpdatedAt: original.updatedAt }, randomUUID());
    await assert.rejects(service.outcome(user, original.id, 'consume', { confirmed: true, expectedUpdatedAt: original.updatedAt }, randomUUID()), error => error.code === 'ITEM_CHANGED');
    assert.equal((await service.find(user, original.id)).updatedAt, updated.updatedAt);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_MUTATION_ROLLBACK_CHECK_FAILED'); }
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
