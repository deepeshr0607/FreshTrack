const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { createAccountDeletionService, deletionSubjectHash } = require('../dist/services/accountDeletion');
const { createHouseholdService } = require('../dist/services/households');
requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const households = new Set(), subjects = new Set();
async function fixture(shared = false) {
  const account = { id: `freshtrack-dev-test:account-deletion:${randomUUID()}`, email: 'fixture@example.test', name: 'Deletion fixture' };
  subjects.add(account.id); const id = randomUUID(); households.add(id);
  await db.$transaction(async tx => {
    await tx.household.create({ data: { id, name: 'Deletion fixture', members: { create: { authSubject: account.id } } } });
    await tx.userPreference.create({ data: { authSubject: account.id } });
    if (shared) {
      const other = `freshtrack-dev-test:account-deletion:${randomUUID()}`; subjects.add(other);
      await tx.householdMember.create({ data: { householdId: id, authSubject: other } });
    }
    const receipt = await tx.receiptScan.create({ data: { householdId: id, createdByAuthSubject: account.id, status: 'IMPORTED', importedAt: new Date() } });
    const item = await tx.pantryItem.create({ data: { householdId: id, name: 'Deletion fixture milk', normalizedName: 'deletion fixture milk',
      category: 'DAIRY', quantity: '1', unit: 'l', expiresOn: new Date('2026-10-25T00:00:00Z'), expirySource: 'USER_ENTERED',
      source: 'RECEIPT', receiptScanId: receipt.id } });
    await tx.pantryItemEvent.create({ data: { householdId: id, pantryItemId: item.id, eventType: 'CREATED', newStatus: 'ACTIVE',
      quantity: item.quantity, costSource: 'UNKNOWN', currencyCode: 'INR', category: 'DAIRY', expiresOn: item.expiresOn, timezone: 'Asia/Kolkata' } });
  });
  return { account, householdId: id };
}
after(async () => {
  try {
    const where = { householdId: { in: [...households] } };
    await db.pantryItemEvent.deleteMany({ where }); await db.pantryItem.deleteMany({ where }); await db.receiptScan.deleteMany({ where });
    await db.household.deleteMany({ where: { id: { in: [...households] } } });
    await db.accountDeletion.deleteMany({ where: { subjectHash: { in: [...subjects].map(deletionSubjectHash) } } });
    assert.equal(await db.household.count({ where: { id: { in: [...households] } } }), 0);
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: [...subjects] } } }), 0);
    assert.equal(await db.accountDeletion.count({ where: { subjectHash: { in: [...subjects].map(deletionSubjectHash) } } }), 0);
    process.stdout.write('Disposable account-deletion fixtures and markers cleaned up\n');
  } finally { await db.$disconnect(); }
});
test('real FK graph deletes only the signed-in fixture, including items/events/receipts/member/preferences; replay is safe', async () => {
  const a = await fixture(), b = await fixture(), service = createAccountDeletionService(db);
  assert.deepEqual((await service.review(a.account)).counts, { groceries: 1, events: 1, receipts: 1 });
  await service.removeData(a.account); await service.removeData(a.account);
  for (const model of ['pantryItem', 'pantryItemEvent', 'receiptScan', 'householdMember']) assert.equal(await db[model].count({ where: { householdId: a.householdId } }), 0);
  assert.equal(await db.userPreference.count({ where: { authSubject: a.account.id } }), 0);
  assert.equal(await db.household.count({ where: { id: a.householdId } }), 0);
  assert.equal(await db.accountDeletion.count({ where: { subjectHash: deletionSubjectHash(a.account.id) } }), 1);
  assert.deepEqual((await service.review(b.account)).counts, { groceries: 1, events: 1, receipts: 1 });
  await assert.rejects(service.assertActive(a.account), e => e.code === 'ACCOUNT_DATA_DELETED');
  await service.assertActive(b.account);
});
test('real shared-household guard leaves all rows and both memberships intact', async () => {
  const a = await fixture(true), service = createAccountDeletionService(db);
  assert.equal((await service.review(a.account)).state, 'SHARED_HOUSEHOLD');
  await assert.rejects(service.removeData(a.account), e => e.code === 'SHARED_HOUSEHOLD');
  assert.equal(await db.householdMember.count({ where: { householdId: a.householdId } }), 2);
  assert.equal(await db.pantryItem.count({ where: { householdId: a.householdId } }), 1);
  assert.equal(await db.accountDeletion.count({ where: { subjectHash: deletionSubjectHash(a.account.id) } }), 0);
});
test('real transaction rollback restores removed children and marker after a late failure', async () => {
  const a = await fixture();
  const broken = { accountDeletion: db.accountDeletion, $transaction: (run, options) => db.$transaction(tx => run({
    accountDeletion: tx.accountDeletion, householdMember: tx.householdMember, pantryItem: tx.pantryItem, pantryItemEvent: tx.pantryItemEvent,
    receiptScan: tx.receiptScan, household: { deleteMany: async () => { throw Error('fixture-private-rollback'); } },
  }), options) };
  await assert.rejects(createAccountDeletionService(broken).removeData(a.account), e => e.code === 'ACCOUNT_DELETION_UNAVAILABLE');
  assert.deepEqual((await createAccountDeletionService(db).review(a.account)).counts, { groceries: 1, events: 1, receipts: 1 });
  assert.equal(await db.accountDeletion.count({ where: { subjectHash: deletionSubjectHash(a.account.id) } }), 0);
});
test('closed account cannot bootstrap a replacement household', async () => {
  const a = await fixture(); await createAccountDeletionService(db).removeData(a.account);
  await assert.rejects(createHouseholdService(db).bootstrap(a.account), e => e.code === 'ACCOUNT_DATA_DELETED');
  assert.equal(await db.householdMember.count({ where: { authSubject: a.account.id } }), 0);
});

test('database guard rejects legacy bootstrap without application checks and rolls back its orphan household', async () => {
  const a = await fixture(); await createAccountDeletionService(db).removeData(a.account);
  const replacementId = randomUUID(); households.add(replacementId);
  await assert.rejects(db.$transaction(async tx => {
    await tx.household.create({ data: { id: replacementId, name: 'Legacy fixture attempt' } });
    await tx.householdMember.create({ data: { householdId: replacementId, authSubject: a.account.id } });
  }, { isolationLevel: 'Serializable' }));
  assert.equal(await db.household.count({ where: { id: replacementId } }), 0);
  assert.equal(await db.householdMember.count({ where: { authSubject: a.account.id } }), 0);
});
