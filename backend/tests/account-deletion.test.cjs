const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createAccountDeletionService, deletionSubjectHash, AccountDeletionFailure } = require('../dist/services/accountDeletion');
const { createHouseholdService } = require('../dist/services/households');
const { createApp } = require('../dist/app');
const user = { id: 'fixture-a', email: 'a@example.test', name: 'A' };
function fixture({ shared = false, fail = false } = {}) {
  let rows = { deleted: false, household: true, members: shared ? 2 : 1, groceries: 2, events: 3, receipts: 1 };
  const scopes = [];
  const marker = { findUnique: async ({ where }) => { assert.equal(where.subjectHash, deletionSubjectHash(user.id)); return rows.deleted ? {} : null; },
    create: async ({ data }) => { assert.deepEqual(data, { subjectHash: deletionSubjectHash(user.id) }); rows.deleted = true; } };
  const db = { accountDeletion: marker, $transaction: async (run, options) => {
    assert.equal(options.isolationLevel, 'Serializable'); const before = structuredClone(rows);
    const remove = key => ({ deleteMany: async ({ where }) => { scopes.push(where); assert.deepEqual(where, { householdId: 'household-a' }); rows[key] = 0; if (fail && key === 'groceries') throw Error('fixture-private-driver'); } });
    try { return await run({ accountDeletion: marker,
      householdMember: { findUnique: async ({ where }) => { assert.deepEqual(where, { authSubject: user.id }); return !rows.household ? null : {
        householdId: 'household-a', household: { _count: { members: rows.members, pantryItems: rows.groceries, pantryEvents: rows.events, receiptScans: rows.receipts } } }; } },
      pantryItemEvent: remove('events'), pantryItem: remove('groceries'), receiptScan: remove('receipts'),
      household: { deleteMany: async ({ where }) => { assert.deepEqual(where, { id: 'household-a', members: { some: { authSubject: user.id }, every: { authSubject: user.id } } }); rows.household = false; return { count: 1 }; } },
    }); } catch (error) { rows = before; throw error; }
  } };
  return { service: createAccountDeletionService(db), state: () => rows, scopes };
}
test('read-only review counts all records without returning household/provider identifiers', async () => {
  const h = fixture();
  assert.deepEqual(await h.service.review(user), { state: 'READY', counts: { groceries: 2, events: 3, receipts: 1 } });
  assert.equal(h.state().deleted, false); assert.equal(h.scopes.length, 0);
});
test('sole owner data and deny marker commit together; acknowledgement replay is idempotent', async () => {
  const h = fixture(); await h.service.removeData(user); await h.service.removeData(user);
  assert.deepEqual(h.state(), { deleted: true, household: false, members: 1, groceries: 0, events: 0, receipts: 0 });
  assert.equal(h.scopes.length, 3);
  await assert.rejects(h.service.assertActive(user), e => e.code === 'ACCOUNT_DATA_DELETED');
  assert.equal((await h.service.review(user)).state, 'DATA_DELETED');
});
test('shared household and transaction failure preserve all data and omit deletion marker', async () => {
  for (const [options, code] of [[{ shared: true }, 'SHARED_HOUSEHOLD'], [{ fail: true }, 'ACCOUNT_DELETION_UNAVAILABLE']]) {
    const h = fixture(options); await assert.rejects(h.service.removeData(user), e => e.code === code && !e.message.includes('fixture-private'));
    assert.equal(h.state().deleted, false); assert.equal(h.state().groceries, 2); assert.equal(h.state().events, 3);
    await h.service.assertActive(user);
  }
});
test('no-household account still gets blocked; database availability fails closed', async () => {
  const h = fixture(); h.state().household = false;
  await h.service.removeData(user); assert.equal(h.scopes.length, 0); assert.equal(h.state().deleted, true);
  const service = createAccountDeletionService({ accountDeletion: { findUnique: async () => { throw Error('private-db-url'); } } });
  await assert.rejects(service.assertActive(user), e => e.unavailable === true && !e.message.includes('private-db'));
});
test('bootstrap rechecks deletion inside its transaction and cannot recreate a closed account', async () => {
  let writes = 0;
  const service = createHouseholdService({ $transaction: run => run({ accountDeletion: { findUnique: async () => ({}) }, household: { create: async () => { writes++; } } }) });
  await assert.rejects(service.bootstrap(user), e => e.code === 'ACCOUNT_DATA_DELETED'); assert.equal(writes, 0);
});
test('HTTP boundary rejects anonymous, identity overrides, missing confirmation and query fields before deletion', async () => {
  let calls = 0;
  const service = { assertActive: async () => {}, review: async identity => { assert.equal(identity.id, user.id); return { state: 'READY', counts: { groceries: 0, events: 0, receipts: 0 } }; }, removeData: async identity => { calls++; assert.equal(identity.id, user.id); } };
  const app = createApp({ verifyIdentity: async () => user, accountDeletionService: service });
  assert.equal((await request(app).post('/api/v1/account/deletion').send({ confirmation: 'DELETE', email: user.email })).status, 401);
  for (const body of [{}, { confirmation: 'delete', email: user.email }, { confirmation: 'DELETE', email: 'victim@example.test' },
    { confirmation: 'DELETE', email: user.email, userId: 'victim' }, { confirmation: 'DELETE', email: user.email, householdId: 'victim' }]) {
    const res = await request(app).post('/api/v1/account/deletion').set('Authorization', 'Bearer a.b.c').send(body);
    assert.equal(res.status, 400);
  }
  assert.equal((await request(app).get('/api/v1/account/deletion?userId=victim').set('Authorization', 'Bearer a.b.c')).status, 400);
  assert.equal(calls, 0);
  const res = await request(app).post('/api/v1/account/deletion').set('Authorization', 'Bearer a.b.c').send({ confirmation: 'DELETE', email: user.email });
  assert.equal(res.status, 200); assert.equal(calls, 1); assert.equal(res.headers['cache-control'], 'no-store');
});
test('old verified tokens cannot read/bootstrap a deleted account but can resume its deletion; other accounts unaffected', async () => {
  const service = { assertActive: async identity => { if (identity.id === user.id) throw new AccountDeletionFailure('ACCOUNT_DATA_DELETED'); },
    review: async () => ({ state: 'DATA_DELETED', counts: { groceries: 0, events: 0, receipts: 0 } }), removeData: async () => {} };
  const app = createApp({ verifyIdentity: async token => token === 'a.b.c' ? user : { ...user, id: 'fixture-b' }, accountDeletionService: service,
    householdService: { bootstrap: async () => assert.fail('Deleted identity cannot reach setup') } });
  for (const path of ['/api/v1/auth/me', '/api/v1/pantry', '/api/v1/households/current', '/api/v1/chef/ingredients', '/api/v1/analytics/summary']) {
    assert.equal((await request(app).get(path).set('Authorization', 'Bearer a.b.c')).status, 403, path);
  }
  assert.equal((await request(app).post('/api/v1/households/current').set('Authorization', 'Bearer a.b.c').send({})).status, 403);
  assert.equal((await request(app).get('/api/v1/account/deletion').set('Authorization', 'Bearer a.b.c')).body.data.state, 'DATA_DELETED');
  assert.equal((await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer d.e.f')).status, 200);
});
