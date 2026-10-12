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
// Existing lifecycle fixtures intentionally represent separate purchases, even with identical labels.
function createFixturePantryService(db) {
  const service = createPantryService(db);
  return { ...service, create: (user, fields, key) => service.create(user, {
    ...fields, duplicateConfirmation: { confirmed: true, action: 'add_separately' },
  }, key) };
}
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
    const user = await account(); const service = createFixturePantryService(db);
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
    const a = await account(), b = await account(); const service = createFixturePantryService(db);
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
    const user = await account(); const service = createFixturePantryService(db);
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
    const user = await account(), other = await account(); const service = createFixturePantryService(db); const original = await service.create(user, input, randomUUID());
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
    const a = await account(), b = await account(); const service = createFixturePantryService(db);
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
    const user = await account(); const service = createFixturePantryService(db); const original = await service.create(user, input, randomUUID());
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
    const a = await account(), b = await account(); const service = createFixturePantryService(db);
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
    const user = await account(); const service = createFixturePantryService(db); const original = await service.create(user, input, randomUUID());
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
    const user = await account(); const service = createFixturePantryService(db); const key = randomUUID();
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
    const a = await account(), b = await account(); const service = createFixturePantryService(db);
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
    assert.equal((await createFixturePantryService(db).list(user, { page: 1, pageSize: 50 })).pagination.total, 0);
    await assert.rejects(createFixturePantryService(db).create({ ...user, id: 'freshtrack-dev-test:no-membership' }, input, randomUUID()),
      error => error instanceof PantryFailure && error.code === 'HOUSEHOLD_REQUIRED');
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_ROLLBACK_CHECK_FAILED'); }
});

test('estimated expiry persists through replay and edits; package/manual priority and event snapshots remain consistent', async () => {
  try {
    const user = await account(), foreign = await account(), service = createFixturePantryService(db);
    const estimate = { packageDate: null, userDate: null, preset: { baseDate: '2026-10-12', days: 7 } };
    const fields = pantryInput({ ...input, expiresOn: '2026-10-19', expirySelection: estimate });
    const key = randomUUID(); const item = await service.create(user, fields, key);
    assert.equal(item.expirySource, 'PRESET_ESTIMATE'); assert.equal(item.freshnessPresetDays, 7); assert.equal(item.purchaseDate, '2026-10-12');
    assert.equal((await service.create(user, fields, key)).id, item.id);
    const restored = await service.find(user, item.id); assert.equal(restored.expirySource, 'PRESET_ESTIMATE');
    await assert.rejects(service.edit(foreign, item.id, { ...fields, expectedUpdatedAt: item.updatedAt }, randomUUID()), error => error.code === 'ITEM_NOT_FOUND');
    const customized = pantryInput({ ...input, expiresOn: '2026-10-21', expirySelection: { ...estimate, preset: { ...estimate.preset, days: 9 } } });
    const editKey = randomUUID(); const changed = await service.edit(user, item.id, { ...customized, expectedUpdatedAt: item.updatedAt }, editKey);
    assert.equal(changed.freshnessPresetDays, 9); assert.equal(changed.expiresOn, '2026-10-21');
    await service.edit(user, item.id, { ...customized, expectedUpdatedAt: item.updatedAt }, editKey);
    const printedFields = pantryInput({ ...input, expiresOn: '2026-10-25', expirySelection: { ...estimate, packageDate: '2026-10-25', userDate: '2026-10-20' } });
    const printed = await service.edit(user, item.id, { ...printedFields, expectedUpdatedAt: changed.updatedAt }, randomUUID());
    assert.equal(printed.expirySource, 'PACKAGE_DATE'); assert.equal(printed.freshnessPresetDays, null);
    const manualFields = pantryInput({ ...input, expiresOn: '2026-10-20', expirySelection: { ...estimate, userDate: '2026-10-20' } });
    const manual = await service.edit(user, item.id, { ...manualFields, expectedUpdatedAt: printed.updatedAt }, randomUUID());
    assert.equal(manual.expirySource, 'USER_ENTERED'); assert.equal(manual.freshnessPresetDays, null);
    const events = await db.pantryItemEvent.findMany({ where: { pantryItemId: item.id }, orderBy: { occurredAt: 'asc' } });
    assert.deepEqual(events.map(event => event.expiresOn.toISOString().slice(0, 10)), ['2026-10-19', '2026-10-21', '2026-10-25', '2026-10-20']);
    assert.deepEqual(events.map(event => event.metadata.expirySource), ['PRESET_ESTIMATE', 'PRESET_ESTIMATE', 'PACKAGE_DATE', 'USER_ENTERED']);
    assert.equal(events[0].metadata.freshnessPresetDays, 7); assert.equal(events[1].metadata.freshnessPresetDays, 9);
    assert.equal((await service.list(user, { page: 1, pageSize: 50 })).items[0].expiresOn, manual.expiresOn);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_EXPIRY_CHECK_FAILED'); }
});

test('server filters find entries outside the loaded page, compose literal search/category and keep household-global counts', async () => {
  try {
    const user = await account(), foreign = await account(), service = createFixturePantryService(db);
    const first = await service.create(user, { ...input, name: 'A bread', category: 'BAKERY', expiresOn: '2026-10-12' }, randomUUID());
    const target = await service.create(user, { ...input, name: 'Z 100%_\\ Milk', expiresOn: '2026-11-25' }, randomUUID());
    const next = await service.create(user, { ...input, name: 'Z 100%_\\ Milk', expiresOn: '2026-11-26' }, randomUUID());
    await service.create(user, { ...input, name: 'Z 100wild Milk', expiresOn: '2026-11-25' }, randomUUID());
    await service.create(foreign, { ...input, name: 'Z 100%_\\ Milk' }, randomUUID());
    const page = { page: 1, pageSize: 1 };
    assert.equal((await service.list(user, page)).items[0].id, first.id);
    const filters = { q: '100%_\\ milk', category: 'DAIRY', sort: 'name' };
    const result = await service.list(user, page, filters);
    assert.equal(result.pagination.total, 2); assert.equal(result.inventory.active, 4); assert.equal(result.inventory.categories.DAIRY, 3);
    const second = await service.list(user, { ...page, page: 2 }, filters);
    assert.deepEqual([result.items[0].id, second.items[0].id], [target.id, next.id].sort());
    assert.equal(second.pagination.hasNextPage, false);
    assert.equal((await service.list(user, page, { ...filters, category: 'BAKERY' })).pagination.total, 0);
    assert.equal((await service.list(user, page, { q: 'no match' })).inventory.active, 4);
    assert.equal((await service.list(user, { ...page, pageSize: 10 }, { sort: 'category' })).items[0].category, 'BAKERY');
    assert.equal((await service.list(user, page, { sort: 'category' })).items[0].id, first.id);
    assert.equal((await service.list(user, { ...page, page: 2 }, { sort: 'category' })).items[0].category, 'DAIRY');
    await service.outcome(user, target.id, 'consume', { confirmed: true, expectedUpdatedAt: target.updatedAt }, randomUUID());
    assert.equal((await service.list(user, page, filters)).pagination.total, 1);
    assert.equal((await service.list(user, page, filters)).inventory.active, 3);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_FILTER_CHECK_FAILED'); }
});
test('critical includes overdue; caution/fresh ranges match Kolkata days and compose category filters', async () => {
  try {
    const { householdDate } = require('../dist/lib/inventoryRules.js');
    const user = await account(), service = createFixturePantryService(db);
    const today = new Date(householdDate(new Date(), 'Asia/Kolkata') + 'T00:00:00Z');
    for (const offset of [-1, 0, 1, 2, 6, 7]) {
      const expiresOn = new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
      await service.create(user, { ...input, name: 'Tier ' + offset, expiresOn }, randomUUID());
    }
    for (const [freshness, expected] of [['critical', [-1, 0, 1]], ['caution', [2, 6]], ['fresh', [7]]]) {
      const result = await service.list(user, { page: 1, pageSize: 50 }, { freshness, category: 'DAIRY' });
      assert.deepEqual(result.items.map(item => item.daysLeft), expected); assert.equal(result.inventory.active, 6);
      assert.equal((await service.list(user, { page: 1, pageSize: 50 }, { freshness, category: 'PRODUCE' })).pagination.total, 0);
    }
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_FRESHNESS_FILTER_CHECK_FAILED'); }
});

test('duplicate preview/cancel writes no groceries; explicit separate purchase preserves original and replay is idempotent', async () => {
  try {
    const user = await account(), service = createPantryService(db);
    const original = await service.create(user, input, randomUUID());
    const candidate = pantryInput({ ...input, name: '  ACCEPTANCE   milk ', quantity: '1', totalCostMinor: 9000 });
    const review = await service.duplicates(user, candidate);
    assert.equal(review.total, 1); assert.equal(review.matches[0].id, original.id);
    await assert.rejects(service.create(user, candidate, randomUUID()), error => error.code === 'PANTRY_DUPLICATE');
    assert.equal((await service.list(user, { page: 1, pageSize: 50 })).pagination.total, 1);
    assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: original.id } }), 1);
    const confirmed = { ...candidate, duplicateConfirmation: { confirmed: true, action: 'add_separately' } }, key = randomUUID();
    const separate = await service.create(user, confirmed, key);
    await service.create(user, confirmed, key);
    await assert.rejects(service.create(user, { ...confirmed, quantity: '2' }, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
    assert.notEqual(separate.id, original.id); assert.equal((await service.list(user, { page: 1, pageSize: 50 })).pagination.total, 2);
    const untouched = await service.find(user, original.id); assert.equal(untouched.updatedAt, original.updatedAt);
    assert.equal(untouched.quantity, original.quantity); assert.equal(untouched.totalCostMinor, original.totalCostMinor); assert.equal(untouched.status, 'ACTIVE');
    assert.equal(await db.pantryItemEvent.count({ where: { pantryItemId: separate.id } }), 1);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_DUPLICATE_CONFIRMATION_CHECK_FAILED'); }
});
test('duplicate matching is household scoped and exact; date/category/similar names and resolved entries are distinct', async () => {
  try {
    const user = await account(), other = await account(), service = createPantryService(db);
    const original = await service.create(user, input, randomUUID());
    assert.equal((await service.duplicates(other, input)).total, 0);
    await service.create(other, input, randomUUID());
    for (const fields of [{ expiresOn: '2026-11-01' }, { category: 'OTHER' }, { name: 'Acceptance milkshake' }]) {
      assert.equal((await service.duplicates(user, { ...input, ...fields })).total, 0);
    }
    await service.outcome(user, original.id, 'consume', { confirmed: true, expectedUpdatedAt: original.updatedAt }, randomUUID());
    assert.equal((await service.duplicates(user, input)).total, 0);
    await service.create(user, input, randomUUID());
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_DUPLICATE_SCOPE_CHECK_FAILED'); }
});
test('concurrent first additions require confirmation for the second matching purchase even after an empty preflight', async () => {
  try {
    const user = await account(), service = createPantryService(db);
    assert.equal((await service.duplicates(user, input)).total, 0);
    const results = await Promise.allSettled([service.create(user, input, randomUUID()), service.create(user, input, randomUUID())]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.code, 'PANTRY_DUPLICATE');
    assert.equal((await service.duplicates(user, input)).total, 1);
    assert.equal((await service.list(user, { page: 1, pageSize: 50 })).pagination.total, 1);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('PANTRY_DUPLICATE_RACE_CHECK_FAILED'); }
});
