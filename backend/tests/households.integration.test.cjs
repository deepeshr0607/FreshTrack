const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
const { createApp } = require('../dist/app.js');
const { createIdentityVerifier } = require('../dist/services/auth.js');
const { createHouseholdService, HouseholdUnavailable } = require('../dist/services/households.js');

requireDevelopmentDatabase();
if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw new Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
const db = new PrismaClient({ log: [], errorFormat: 'minimal' });
const createdIds = new Set();
const subjects = new Set();
let verifyIdentity, jwtFor;
function identity() {
  const id = `freshtrack-dev-test:household:${randomUUID()}`;
  subjects.add(id);
  return { id, email: 'fixture@example.test', name: 'Fixture' };
}

function client(failPreferences = false) {
  return {
    household: db.household,
    $transaction: (run, options) => db.$transaction(async tx => {
      const household = {
        findFirst: tx.household.findFirst,
        create: async args => {
          const row = await tx.household.create(args);
          createdIds.add(row.id); // Includes rolled-back attempts, without logging any row.
          return row;
        },
      };
      const userPreference = { upsert: failPreferences
        ? async () => { throw new Error('fixture-sensitive-failure'); }
        : tx.userPreference.upsert };
      return run({ household, householdMember: tx.householdMember, userPreference });
    }, options),
  };
}

before(async () => {
  const { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } = await import('jose');
  const keys = await generateKeyPair('EdDSA');
  const jwk = await exportJWK(keys.publicKey);
  verifyIdentity = createIdentityVerifier(process.env.NEON_AUTH_URL, createLocalJWKSet({ keys: [{ ...jwk, kid: 'integration' }] }));
  const issuer = new URL(process.env.NEON_AUTH_URL).origin;
  jwtFor = account => new SignJWT({ ...account, emailVerified: true }).setProtectedHeader({ alg: 'EdDSA', kid: 'integration' })
    .setSubject(account.id).setIssuer(issuer).setAudience(issuer).setIssuedAt().setExpirationTime('15m').sign(keys.privateKey);
});

after(async () => {
  try {
    // Only IDs created by this run, with its subjects or rolled-back orphan attempts, are disposable.
    await db.household.deleteMany({ where: { id: { in: [...createdIds] }, OR: [
      { members: { some: { authSubject: { in: [...subjects] } } } }, { members: { none: {} } },
    ] } });
    assert.equal(await db.householdMember.count({ where: { authSubject: { in: [...subjects] } } }), 0);
    assert.equal(await db.household.count({ where: { id: { in: [...createdIds] } } }), 0);
  } finally { await db.$disconnect(); }
});

test('concurrent bootstrap creates one household/member/preferences and no orphan attempts', async () => {
  const account = identity();
  const service = createHouseholdService(client());
  const outcomes = await Promise.allSettled(Array.from({ length: 6 }, () => service.bootstrap(account)));
  assert.ok(outcomes.every(result => result.status === 'fulfilled'));
  assert.equal(new Set(outcomes.map(result => result.value.id)).size, 1);
  const household = outcomes[0].value;
  assert.equal(household.currencyCode, 'INR');
  assert.equal(household.timezone, 'Asia/Kolkata');
  assert.equal(household.preferences.preferredNotificationTime, '18:30');
  assert.match(household.createdAt, /Z$/);
  assert.equal(await db.householdMember.count({ where: { authSubject: account.id } }), 1);
  assert.equal(await db.userPreference.count({ where: { authSubject: account.id } }), 1);
  assert.equal(await db.household.count({ where: { id: { in: [...createdIds] } } }), 1);
});

test('repeat setup preserves choices and repairs missing preferences without replacing the household', async () => {
  const account = identity();
  const service = createHouseholdService(client());
  const first = await service.bootstrap(account);
  await db.userPreference.update({ where: { authSubject: account.id }, data: { notificationEnabled: true, preferredNotificationTime: '19:45' } });
  const repeat = await service.bootstrap(account);
  assert.equal(repeat.id, first.id);
  assert.equal(repeat.preferences.notificationEnabled, true);
  assert.equal(repeat.preferences.preferredNotificationTime, '19:45');
  await db.userPreference.delete({ where: { authSubject: account.id } });
  const repaired = await service.bootstrap(account);
  assert.equal(repaired.id, first.id);
  assert.equal(repaired.preferences.preferredNotificationTime, '18:30');
});

test('a failure after household/member creation rolls back all writes and a later retry recovers', async () => {
  const account = identity();
  const beforeIds = new Set(createdIds);
  await assert.rejects(createHouseholdService(client(true)).bootstrap(account), HouseholdUnavailable);
  const failedIds = [...createdIds].filter(id => !beforeIds.has(id));
  assert.equal(failedIds.length, 1);
  assert.equal(await db.household.count({ where: { id: { in: failedIds } } }), 0);
  assert.equal(await db.householdMember.count({ where: { authSubject: account.id } }), 0);
  assert.equal(await db.userPreference.count({ where: { authSubject: account.id } }), 0);
  assert.ok((await createHouseholdService(client()).bootstrap(account)).id);
});

test('signed HTTP requests bootstrap/read only their account; foreign and unknown IDs both return 404', async () => {
  const a = identity(), b = identity(), newcomer = identity();
  const service = createHouseholdService(client());
  const app = createApp({ verifyIdentity, householdService: service });
  const tokenA = `Bearer ${await jwtFor(a)}`, tokenB = `Bearer ${await jwtFor(b)}`;
  const setup = accountToken => request(app).post('/api/v1/households/current').set('Authorization', accountToken).send({});
  const responseA = await setup(tokenA), responseB = await setup(tokenB);
  assert.equal(responseA.status, 200); assert.equal(responseB.status, 200);
  const idA = responseA.body.data.household.id, idB = responseB.body.data.household.id;
  assert.notEqual(idA, idB);
  const own = await request(app).get(`/api/v1/households/${idA}`).set('Authorization', tokenA).set('x-user-id', b.id);
  assert.equal(own.status, 200); assert.equal(own.body.data.household.id, idA);
  assert.equal(own.headers['cache-control'], 'no-store');
  for (const id of [idB, randomUUID()]) {
    const res = await request(app).get(`/api/v1/households/${id}`).set('Authorization', tokenA);
    assert.equal(res.status, 404); assert.equal(res.body.error.code, 'HOUSEHOLD_NOT_FOUND');
    assert.equal(res.body.error.requestId, res.headers['x-request-id']);
  }
  const noSetup = await request(app).get('/api/v1/households/current').set('Authorization', `Bearer ${await jwtFor(newcomer)}`);
  assert.equal(noSetup.status, 404);
  assert.equal(await db.householdMember.count({ where: { authSubject: newcomer.id } }), 0);
  assert.equal((await request(app).get('/api/v1/households/current')).status, 401);
  assert.equal((await request(app).post('/api/v1/households/current').set('Authorization', tokenA).send({ userId: b.id })).status, 400);
  assert.equal((await request(app).get('/api/v1/households/current').set('Authorization', tokenB)).body.data.household.id, idB);
  assert.equal(JSON.stringify(own.body).includes('authSubject'), false);
});

test('membership removal blocks the next household read even with the same valid JWT', async () => {
  const account = identity();
  const service = createHouseholdService(client());
  const household = await service.bootstrap(account);
  const app = createApp({ verifyIdentity, householdService: service });
  const authorization = `Bearer ${await jwtFor(account)}`;
  await db.householdMember.delete({ where: { authSubject: account.id } });
  const res = await request(app).get(`/api/v1/households/${household.id}`).set('Authorization', authorization);
  assert.equal(res.status, 404);
  assert.equal(await service.findForIdentity(account), null);
});
