const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const { createPantryService, receiptInput } = require('../dist/services/pantry.js');

const identity = { id: 'fixture-subject', email: 'fixture@example.test', name: 'Fixture' };
const base = { category: 'OTHER', quantity: '0.5', unit: 'kg', expiresOn: '2026-10-25', totalCostMinor: null };
function fixture({ duplicate = false, omitLast = false } = {}) {
  const state = { events: [], items: [], writes: 0, options: null };
  const tx = {
    householdMember: { findUnique: async args => {
      assert.equal(args.where.authSubject, identity.id);
      return { householdId: 'fixture-household', household: { timezone: 'Asia/Kolkata' } };
    } },
    pantryItem: {
      groupBy: async args => {
        assert.equal(args.where.householdId, 'fixture-household');
        assert.equal(args.where.household.members.some.authSubject, identity.id);
        return duplicate ? [{ normalizedName: 'milk', category: 'OTHER', expiresOn: new Date('2026-10-25'), _count: { _all: 1 } }] : [];
      },
      findMany: async () => assert.fail('Import must not load duplicate-preview cards'),
      createManyAndReturn: async ({ data }) => {
        state.writes++; state.items = data;
        const rows = data.map(row => ({ ...row, status: 'ACTIVE', quantity: new Prisma.Decimal(row.quantity),
          createdAt: new Date('2026-10-21T00:00:00Z'), updatedAt: new Date('2026-10-21T00:00:00Z') }));
        // The driver does not promise insertion order for returned records.
        return (omitLast ? rows.slice(0, -1) : rows).reverse();
      },
    },
    receiptScan: { create: async () => { state.writes++; return { id: 'fixture-receipt' }; } },
    pantryItemEvent: { findMany: async () => [], createMany: async ({ data }) => { state.events = data; state.writes++; return { count: data.length }; } },
  };
  return { state, service: createPantryService({ $transaction: async (run, options) => { state.options = options; return run(tx); } }) };
}

test('bulk receipt maps shuffled records to their original row/event and preserves exact expiry/cost provenance', async () => {
  const { state, service } = fixture();
  const input = receiptInput({ confirmed: true, items: [
    { rowId: 'z', item: { ...base, name: 'Milk', totalCostMinor: 0, expirySelection: { packageDate: '2026-10-25', userDate: null, preset: null } } },
    { rowId: 'a', item: { ...base, name: 'Rice', expirySelection: { packageDate: null, userDate: null, preset: { baseDate: '2026-10-21', days: 4 } } } },
    { rowId: 'm', item: { ...base, name: 'Apples', totalCostMinor: 6050 } },
  ] }, true);
  const result = await service.receiptImport(identity, input, 'receipt-bulk-test-123456');
  assert.deepEqual(result.items.map(item => item.name), ['Rice', 'Apples', 'Milk']);
  assert.deepEqual(result.items.map(item => item.totalCostMinor), [null, 6050, 0]);
  assert.deepEqual(result.items.map(item => item.expirySource), ['PRESET_ESTIMATE', 'USER_ENTERED', 'PACKAGE_DATE']);
  assert.equal(result.items[0].purchaseDate, '2026-10-21'); assert.equal(result.items[0].freshnessPresetDays, 4);
  assert.equal(state.writes, 3); assert.equal(state.options.timeout, 10000); assert.equal(state.options.isolationLevel, 'Serializable');
  for (const [index, event] of state.events.entries()) {
    assert.equal(event.pantryItemId, result.items[index].id);
    assert.equal(event.metadata.rowId, input.items[index].rowId);
    assert.equal(event.idempotencyKey, `receipt:receipt-bulk-test-123456:${index}`);
    assert.equal(event.totalCostMinor, result.items[index].totalCostMinor);
    assert.equal(event.quantity.toString(), '0.5'); assert.equal(event.householdId, 'fixture-household');
    assert.equal(event.timezone, 'Asia/Kolkata'); assert.equal(event.metadata.expirySource, result.items[index].expirySource);
    assert.equal(state.items[index].source, 'RECEIPT'); assert.equal(state.items[index].receiptScanId, result.receiptScanId);
  }
});

test('duplicate totals still block bulk writes until the matching row is explicitly confirmed', async () => {
  const { state, service } = fixture({ duplicate: true });
  const input = receiptInput({ confirmed: true, items: [{ rowId: 'milk', item: { ...base, name: 'Milk' } }] }, true);
  await assert.rejects(service.receiptImport(identity, input, 'receipt-bulk-test-123456'), error => error.code === 'PANTRY_DUPLICATE');
  assert.equal(state.writes, 0);
  input.items[0].item.duplicateConfirmation = { confirmed: true, action: 'add_separately' };
  const result = await service.receiptImport(identity, input, 'receipt-bulk-test-123456');
  assert.equal(result.items.length, 1); assert.equal(state.events[0].metadata.duplicateConfirmed, true);
});

test('incomplete bulk-return records fail closed before writing mismatched event history', async () => {
  const { state, service } = fixture({ omitLast: true });
  const input = receiptInput({ confirmed: true, items: [{ rowId: 'milk', item: { ...base, name: 'Milk' } }] }, true);
  await assert.rejects(service.receiptImport(identity, input, 'receipt-bulk-test-123456'), error => error.code === 'PANTRY_UNAVAILABLE');
  assert.equal(state.events.length, 0);
});
