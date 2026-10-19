const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { createPantryService } = require('../dist/services/pantry.js');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' }), ids = [], subjects = [];
async function account() {
  const id = randomUUID(), subject = `freshtrack-dev-test:receipt-client:${randomUUID()}`;
  ids.push(id); subjects.push(subject);
  await db.household.create({ data: { id, name: 'Receipt client fixture', members: { create: { authSubject: subject } } } });
  return { id: subject, email: 'fixture@example.test', name: 'Fixture' };
}
after(async () => {
  try {
    const scoped = await db.household.findMany({ where: { id: { in: ids }, members: { some: { authSubject: { in: subjects } } } }, select: { id: true } });
    const householdId = { in: scoped.map(row => row.id) };
    await db.$transaction(async tx => { await tx.pantryItem.deleteMany({ where: { householdId } }); await tx.receiptScan.deleteMany({ where: { householdId } }); await tx.household.deleteMany({ where: { id: householdId } }); });
    assert.equal(await db.household.count({ where: { id: { in: ids } } }), 0);
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: subjects } } }), 0);
  } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('RECEIPT_CLIENT_FIXTURE_CLEANUP_FAILED'); }
  finally { await db.$disconnect(); }
});
function check(name, fn) { test(name, { timeout: 60000 }, async () => { try { await fn(); } catch (error) { if (error.name === 'AssertionError') throw error; throw Error('RECEIPT_CLIENT_DATABASE_CHECK_FAILED'); } }); }
const input = { items: [{ rowId: 'milk', item: { name: 'Receipt Client Milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20', totalCostMinor: 6050 } },
  { rowId: 'bread', item: { name: 'Receipt Client Bread', category: 'BAKERY', quantity: '1', unit: 'loaf', expiresOn: '2026-10-21', totalCostMinor: null } }] };
async function modules() { return { ...await import('../../lib/receiptImport.ts'), ...await import('../../lib/neonAuth.ts') }; }
check('real server commit then lost response/restarted mobile controller preserves one receipt and exact CREATED events', async () => {
  const { createReceiptImportStorage, createReceiptImportController, NeonAuthError } = await modules();
  const user = await account(), service = createPantryService(db), values = new Map(); let lose = true, calls = [];
  const storage = createReceiptImportStorage({ get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } }, user.id);
  const controller = () => createReceiptImportController({ storage, active: () => true,
    review: body => service.receiptReview(user, body), send: async (body, key) => {
      calls.push(JSON.stringify({ body, key })); const result = await service.receiptImport(user, body, key);
      if (lose) throw new NeonAuthError('PANTRY_NETWORK', 'Lost fixture response.'); return result;
    } }, randomUUID);
  const first = controller(); await first.restore(); await first.review(input); await first.confirm();
  assert.equal(first.getSnapshot().stage, 'pending'); assert.ok(await storage.load());
  const membership = await db.householdMember.findUniqueOrThrow({ where: { authSubject: user.id } });
  const counts = () => Promise.all([db.receiptScan.count({ where: { householdId: membership.householdId } }), db.pantryItem.count({ where: { householdId: membership.householdId } }), db.pantryItemEvent.count({ where: { householdId: membership.householdId } })]);
  assert.deepEqual(await counts(), [1, 2, 2]); lose = false;
  const restarted = controller(); await restarted.restore(); assert.equal(calls.length, 1); await restarted.retry();
  assert.equal(restarted.getSnapshot().stage, 'saved'); assert.equal(restarted.getSnapshot().result.replayed, true); assert.equal(calls[0], calls[1]);
  assert.equal(await storage.load(), null); assert.deepEqual(await counts(), [1, 2, 2]);
  const bread = restarted.getSnapshot().result.items.find(item => item.name.includes('Bread')); assert.equal(bread.totalCostMinor, null);
});
check('mobile duplicate Skip/Add Separately submits only selected fields and preserves existing purchases', async () => {
  const { createReceiptImportStorage, createReceiptImportController } = await modules(); const user = await account(), service = createPantryService(db), values = new Map();
  const existing = await service.create(user, input.items[0].item, randomUUID());
  const storage = createReceiptImportStorage({ get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } }, user.id);
  const ctrl = createReceiptImportController({ storage, active: () => true, review: body => service.receiptReview(user, body), send: (body, key) => service.receiptImport(user, body, key) }, randomUUID);
  await ctrl.restore(); await ctrl.review(input); ctrl.choose('milk', 'skip'); await ctrl.confirm();
  assert.equal(ctrl.getSnapshot().result.items.length, 1); assert.equal(ctrl.getSnapshot().result.items[0].name, 'Receipt Client Bread');
  ctrl.reset(); await ctrl.review({ items: [{ rowId: 'milk', item: { ...input.items[0].item, quantity: '2', totalCostMinor: 8000 } }] });
  ctrl.choose('milk', 'separate'); await ctrl.confirm(); assert.equal(ctrl.getSnapshot().result.items[0].quantity, '2');
  assert.equal((await service.find(user, existing.id)).quantity, '0.5'); assert.equal((await service.find(user, existing.id)).totalCostMinor, 6050);
  const { householdId } = await db.householdMember.findUniqueOrThrow({ where: { authSubject: user.id } });
  assert.equal(await db.receiptScan.count({ where: { householdId } }), 2); assert.equal(await db.pantryItem.count({ where: { householdId } }), 3); assert.equal(await db.pantryItemEvent.count({ where: { householdId } }), 3);
});
check('receipt expiry choices survive client storage/restart and persist exact provenance and event snapshots', async () => {
  const { createReceiptImportStorage, createReceiptImportController, reviewedReceiptInput } = await modules();
  const { saveReceiptCandidate, manualReceiptCandidate } = await import('../../lib/receiptCandidates.ts');
  const user = await account(), service = createPantryService(db), values = new Map();
  const makeRow = (id, name, category, form) => saveReceiptCandidate({ ...manualReceiptCandidate(id), draft: { name, category, quantity: '0.5', unit: 'bag', price: '', expiresOn: '' } }, form);
  const rows = [makeRow('estimated', 'Receipt Estimate Milk', 'Dairy', { packageDate: '', userDate: '', baseDate: '2026-10-19', days: '7' }),
    makeRow('printed', 'Receipt Package Bread', 'Bakery', { packageDate: '2026-10-30', userDate: '2026-10-28', baseDate: '2026-10-19', days: '5' }),
    makeRow('manual', 'Receipt Manual Rice', 'Other', { packageDate: '', userDate: '2026-11-01', baseDate: '', days: '' })];
  const body = reviewedReceiptInput(rows);
  const storage = createReceiptImportStorage({ get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } }, user.id);
  const make = () => createReceiptImportController({ storage, active: () => true, review: input => service.receiptReview(user, input), send: (input, key) => service.receiptImport(user, input, key) }, randomUUID);
  const first = make(); await first.restore(); await first.review(body); await first.confirm(true);
  const frozen = await storage.load(); assert.ok(frozen); assert.equal(frozen.input.items.find(row => row.rowId === 'printed').item.expirySelection.preset, null);
  const restarted = make(); await restarted.restore(); await restarted.retry(true); assert.equal(restarted.getSnapshot().stage, 'saved');
  const result = restarted.getSnapshot().result;
  const estimated = result.items.find(item => item.name === 'Receipt Estimate Milk'), printed = result.items.find(item => item.name === 'Receipt Package Bread'), manual = result.items.find(item => item.name === 'Receipt Manual Rice');
  assert.equal(estimated.expiresOn, '2026-10-26'); assert.equal(estimated.expirySource, 'PRESET_ESTIMATE'); assert.equal(estimated.purchaseDate, '2026-10-19'); assert.equal(estimated.freshnessPresetDays, 7);
  assert.equal(printed.expiresOn, '2026-10-30'); assert.equal(printed.expirySource, 'PACKAGE_DATE'); assert.equal(printed.freshnessPresetDays, null); assert.equal(printed.purchaseDate, null);
  assert.equal(manual.expiresOn, '2026-11-01'); assert.equal(manual.expirySource, 'USER_ENTERED'); assert.equal(manual.freshnessPresetDays, null);
  const { householdId } = await db.householdMember.findUniqueOrThrow({ where: { authSubject: user.id } });
  for (const item of result.items) {
    const events = await db.pantryItemEvent.findMany({ where: { householdId, pantryItemId: item.id } }); assert.equal(events.length, 1);
    assert.equal(events[0].metadata.expirySource, item.expirySource); assert.equal(events[0].expiresOn.toISOString().slice(0, 10), item.expiresOn);
  }
  assert.equal((await service.receiptImport(user, frozen.input, frozen.key)).replayed, true);
  const changed = { ...frozen.input, items: frozen.input.items.map(row => row.rowId === 'estimated' ? { ...row, item: { ...row.item, expiresOn: '2026-10-27', expirySelection: { packageDate: null, userDate: null, preset: { baseDate: '2026-10-19', days: 8 } } } } : row) };
  await assert.rejects(service.receiptImport(user, changed, frozen.key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.equal(await db.receiptScan.count({ where: { householdId } }), 1); assert.equal(await db.pantryItem.count({ where: { householdId } }), 3); assert.equal(await db.pantryItemEvent.count({ where: { householdId } }), 3);
});
