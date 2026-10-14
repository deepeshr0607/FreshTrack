const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createPantryService, pantryInput } = require('../dist/services/pantry.js');
const { createHouseholdService } = require('../dist/services/households.js');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const subjects = [];
const input = pantryInput({ name: 'Notification retry fixture', category: 'OTHER', quantity: '1', unit: 'piece', expiresOn: '2026-12-20', totalCostMinor: null });
const mobile = Promise.all([import('../../lib/notificationOutbox.ts'), import('../../lib/neonAuth.ts'), import('../../lib/pantryApi.ts')]);
async function fixture() {
  const identity = { id: `freshtrack-dev-test:notification-retry:${randomUUID()}`, email: 'fixture@example.test', name: 'Fixture' };
  subjects.push(identity.id);
  const household = await createHouseholdService(db).bootstrap(identity);
  const service = createPantryService(db);
  const item = await service.create(identity, input, randomUUID());
  return { identity, household, service, item };
}
async function outbox(f, action, options = {}) {
  const [{ createNotificationOutbox }, { NeonAuthError }, { requirePantryStatus }] = await mobile;
  const store = options.store || { raw: null };
  const scope = JSON.stringify(['development-fixture', f.identity.id]);
  const calls = [];
  const queue = createNotificationOutbox(scope, {
    read: async () => store.raw, write: async raw => { store.raw = raw; },
    active: options.active || (() => true), acknowledged: async () => undefined,
    send: async row => {
      calls.push({ ...row });
      try {
        const item = await (options.service || f.service).outcome(options.identity || f.identity, row.id, row.action,
          { confirmed: true, expectedUpdatedAt: row.expectedUpdatedAt }, row.key);
        if (options.afterCommit) await options.afterCommit();
        requirePantryStatus([item], row.action === 'consume' ? 'CONSUMED' : 'WASTED');
      } catch (error) {
        if (error.code === 'ITEM_NOT_FOUND') throw new NeonAuthError('PANTRY_HTTP_404', 'Fixture item unavailable');
        if (['ITEM_CHANGED', 'ITEM_RESOLVED', 'IDEMPOTENCY_CONFLICT'].includes(error.code)) throw new NeonAuthError('PANTRY_HTTP_409', 'Fixture changed');
        throw error;
      }
    },
  }, true);
  return { queue, store, calls, row: { id: f.item.id, action, expectedUpdatedAt: f.item.updatedAt, key: randomUUID() } };
}
async function eventCount(f) {
  return db.pantryItemEvent.count({ where: { householdId: f.household.id, pantryItemId: f.item.id, eventType: 'STATUS_CHANGED' } });
}
async function checked(work) {
  try { await work(); } catch (error) {
    if (error.name === 'AssertionError') throw error;
    throw Error('NOTIFICATION_RETRY_DEVELOPMENT_CHECK_FAILED'); // Driver/provider details stay private.
  }
}
after(async () => {
  try {
    // Also recovers an interrupted bootstrap whose committed response was lost. Exact reserved
    // subjects only; seed fixtures, real accounts and shared/mixed-member households are excluded.
    assert.ok(subjects.every(subject => subject.startsWith('freshtrack-dev-test:notification-retry:')));
    await db.household.deleteMany({ where: { members: {
      some: { authSubject: { in: subjects } }, every: { authSubject: { in: subjects } },
    } } });
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: subjects } } }), 0);
    process.stdout.write('Notification retry fixture cleanup passed.\n');
  } catch (error) {
    if (error.name === 'AssertionError') throw error;
    throw Error('NOTIFICATION_RETRY_FIXTURE_CLEANUP_FAILED');
  } finally { await db.$disconnect(); }
});

for (const action of ['consume', 'waste']) test(`${action}: lost committed response and restarted outbox replay create exactly one outcome event`, () => checked(async () => {
  const f = await fixture(); let active = true;
  const first = await outbox(f, action, { active: () => active, afterCommit: async () => { active = false; throw Error('SIMULATED_LOST_RESPONSE'); } });
  await first.queue.confirm(first.row); await first.queue.flush();
  assert.equal(first.queue.getSnapshot().entries.length, 1); assert.equal(await eventCount(f), 1);
  const committed = await f.service.find(f.identity, f.item.id);
  const restart = await outbox(f, action, { store: first.store });
  await restart.queue.flush(); await restart.queue.flush();
  assert.equal(restart.queue.getSnapshot().entries.length, 0);
  assert.deepEqual(restart.calls[0], first.calls[0]);
  await Promise.all(Array.from({ length: 3 }, () => f.service.outcome(f.identity, f.item.id, action,
    { confirmed: true, expectedUpdatedAt: first.row.expectedUpdatedAt }, first.row.key)));
  assert.equal(await eventCount(f), 1);
  assert.equal((await f.service.find(f.identity, f.item.id)).updatedAt, committed.updatedAt);
  await assert.rejects(f.service.outcome(f.identity, f.item.id, action === 'consume' ? 'waste' : 'consume',
    { confirmed: true, expectedUpdatedAt: first.row.expectedUpdatedAt }, first.row.key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  await assert.rejects(f.service.outcome(f.identity, f.item.id, action,
    { confirmed: true, expectedUpdatedAt: committed.updatedAt }, first.row.key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.equal(await eventCount(f), 1);
}));

test('simultaneous first confirmations with the same key append one outcome event', () => checked(async () => {
  const f = await fixture(), key = randomUUID();
  const confirmation = { confirmed: true, expectedUpdatedAt: f.item.updatedAt };
  const results = await Promise.all([f.service.outcome(f.identity, f.item.id, 'consume', confirmation, key),
    f.service.outcome(f.identity, f.item.id, 'consume', confirmation, key)]);
  assert.ok(results.every(item => item.status === 'CONSUMED'));
  assert.equal(await eventCount(f), 1);
  await f.service.outcome(f.identity, f.item.id, 'consume', confirmation, randomUUID());
  assert.equal(await eventCount(f), 1);
}));

test('older queued outcome replay cannot undo a newer restoration and opposite outcome', () => checked(async () => {
  const f = await fixture(); const saved = await outbox(f, 'consume');
  await saved.queue.pause(true); await saved.queue.confirm(saved.row);
  const consumed = await f.service.outcome(f.identity, f.item.id, 'consume', { confirmed: true, expectedUpdatedAt: f.item.updatedAt }, saved.row.key);
  const restored = await f.service.undo(f.identity, f.item.id, { confirmed: true, expectedUpdatedAt: consumed.updatedAt }, randomUUID());
  const wasted = await f.service.outcome(f.identity, f.item.id, 'waste', { confirmed: true, expectedUpdatedAt: restored.updatedAt }, randomUUID());
  await saved.queue.pause(false); await saved.queue.flush();
  assert.equal(saved.queue.getSnapshot().entries[0].blocked, true); assert.equal(saved.calls.length, 1);
  assert.equal((await f.service.find(f.identity, f.item.id)).updatedAt, wasted.updatedAt);
  assert.equal(await eventCount(f), 3);
}));

test('stale queued version is retained for review without applying an outcome', () => checked(async () => {
  const f = await fixture(); const saved = await outbox(f, 'waste');
  await saved.queue.pause(true); await saved.queue.confirm(saved.row);
  const edited = await f.service.edit(f.identity, f.item.id, { ...input, name: 'Newer fixture label', expectedUpdatedAt: f.item.updatedAt }, randomUUID());
  await saved.queue.pause(false); await saved.queue.flush();
  assert.equal(saved.queue.getSnapshot().entries[0].blocked, true);
  assert.equal(await eventCount(f), 0); assert.equal((await f.service.find(f.identity, f.item.id)).updatedAt, edited.updatedAt);
}));

test('foreign household replay is rejected before any outcome event', () => checked(async () => {
  const f = await fixture(), other = await fixture();
  const saved = await outbox(f, 'consume', { identity: other.identity });
  await saved.queue.confirm(saved.row); await saved.queue.flush();
  assert.equal(saved.queue.getSnapshot().entries[0].blocked, true);
  assert.equal(await eventCount(f), 0); assert.equal(await eventCount(other), 0);
  assert.equal((await f.service.find(f.identity, f.item.id)).status, 'ACTIVE');
}));

test('failed outcome event insertion rolls back the item; same-key outbox retry succeeds once', () => checked(async () => {
  const f = await fixture();
  const failing = { $transaction: (run, options) => db.$transaction(tx => run({ ...tx,
    householdMember: tx.householdMember, pantryItem: tx.pantryItem,
    pantryItemEvent: { findUnique: tx.pantryItemEvent.findUnique, create: async () => { throw Error('SIMULATED_EVENT_FAILURE'); } },
  }), options) };
  const first = await outbox(f, 'consume', { service: createPantryService(failing) });
  await first.queue.confirm(first.row); await first.queue.flush();
  assert.equal(first.queue.getSnapshot().entries.length, 1); assert.equal(await eventCount(f), 0);
  assert.equal((await f.service.find(f.identity, f.item.id)).status, 'ACTIVE');
  const retry = await outbox(f, 'consume', { store: first.store }); await retry.queue.flush();
  assert.equal(await eventCount(f), 1); assert.equal(retry.queue.getSnapshot().entries.length, 0);
  assert.deepEqual(first.calls[0], retry.calls[0]);
}));
