import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import appModule from '../dist/app.js';
import authModule from '../dist/services/auth.js';
import householdModule from '../dist/services/households.js';

const { createApp } = appModule;
const { createIdentityVerifier, AuthFailure } = authModule;
const { createHouseholdService, HouseholdUnavailable } = householdModule;
const authUrl = 'https://development.neonauth.neon.tech/neondb/auth';
const issuer = new URL(authUrl).origin;
const keys = await generateKeyPair('EdDSA');
const jwk = await exportJWK(keys.publicKey);
const verifyIdentity = createIdentityVerifier(authUrl, createLocalJWKSet({ keys: [{ ...jwk, kid: 'fixture' }] }));
async function token(subject = 'verified-fixture-account') {
  return new SignJWT({ id: subject, email: 'fixture@example.test', name: 'Fixture', emailVerified: true })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'fixture' }).setSubject(subject)
    .setIssuer(issuer).setAudience(issuer).setIssuedAt().setExpirationTime('15m').sign(keys.privateKey);
}
const household = { id: '10000000-0000-4000-8000-000000000001', name: 'My Kitchen', currencyCode: 'INR', timezone: 'Asia/Kolkata',
  createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z', membership: { role: 'MANAGER' }, preferences: null };

test('household endpoints require signed verified identity before any service access', async () => {
  let calls = 0;
  const service = { bootstrap: async () => { calls++; return household; }, findForIdentity: async () => { calls++; return household; } };
  const app = createApp({ verifyIdentity, householdService: service });
  for (const path of ['/api/v1/households/current', `/api/v1/households/${household.id}`]) {
    const res = await request(app).get(path).set('x-user-id', 'victim').set('Authorization', 'Bearer a.b.c');
    assert.equal(res.status, 401);
  }
  assert.equal((await request(app).post('/api/v1/households/current').send({ userId: 'victim' })).status, 401);
  assert.equal(calls, 0);
});

test('bootstrap takes identity from the verified token and returns a private response', async () => {
  let received;
  const app = createApp({ verifyIdentity, householdService: {
    bootstrap: async identity => { received = identity.id; return household; }, findForIdentity: async () => household,
  } });
  const res = await request(app).post('/api/v1/households/current').set('Authorization', `Bearer ${await token()}`)
    .set('x-user-id', 'victim').send({});
  assert.equal(res.status, 200);
  assert.equal(received, 'verified-fixture-account');
  assert.deepEqual(res.body, { data: { household } });
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('identity overrides, query options, malformed IDs and unexpected bodies are rejected before DB work', async () => {
  let calls = 0;
  const app = createApp({ verifyIdentity, householdService: {
    bootstrap: async () => { calls++; return household; }, findForIdentity: async () => { calls++; return household; },
  } });
  const authorization = `Bearer ${await token()}`;
  for (const body of [{ userId: 'victim' }, { householdId: household.id }, { role: 'MANAGER' }, { currencyCode: 'USD' }, [], null]) {
    const res = await request(app).post('/api/v1/households/current').set('Authorization', authorization)
      .set('Content-Type', 'application/json').send(JSON.stringify(body));
    assert.equal(res.status, 400);
  }
  assert.equal((await request(app).post('/api/v1/households/current').set('Authorization', authorization).set('Content-Type', 'text/plain').send('victim')).status, 400);
  for (const path of ['/api/v1/households/current?userId=victim', '/api/v1/households/current?__proto__[userId]=victim', '/api/v1/households/not-a-uuid']) {
    assert.equal((await request(app).get(path).set('Authorization', authorization)).status, 400);
  }
  assert.equal(calls, 0);
});

test('database failures return safe retryable errors without leaking connection or account details', async () => {
  const failure = new Error('fixture-sensitive-database-material');
  const db = { $transaction: async () => { throw failure; }, household: { findFirst: async () => { throw failure; } } };
  const app = createApp({ verifyIdentity, householdService: createHouseholdService(db) });
  for (const method of ['get', 'post']) {
    const res = await request(app)[method]('/api/v1/households/current').set('Authorization', `Bearer ${await token()}`);
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'HOUSEHOLD_UNAVAILABLE');
    assert.equal(res.body.error.requestId, res.headers['x-request-id']);
    assert.equal(JSON.stringify(res.body).includes('fixture-sensitive'), false);
  }
});

test('serialization and subject uniqueness races retry with a fixed limit; unrelated constraints do not retry', async () => {
  for (const conflict of [{ code: 'P2034' }, { code: 'P2002', meta: { target: ['authSubject'] } }]) {
    let attempts = 0;
    const service = createHouseholdService({ $transaction: async () => {
      if (++attempts < 3) throw conflict;
      return household;
    } });
    assert.deepEqual(await service.bootstrap({ id: 'fixture' }), household);
    assert.equal(attempts, 3);
  }
  for (const [failure, expected] of [[{ code: 'P2034' }, 4], [{ code: 'P2002', meta: { target: ['id'] } }, 1]]) {
    let attempts = 0;
    const service = createHouseholdService({ $transaction: async () => { attempts++; throw failure; } });
    await assert.rejects(service.bootstrap({ id: 'fixture' }), HouseholdUnavailable);
    assert.equal(attempts, expected);
  }
});

test('invalid provider subjects fail authentication before they can reach the database', async () => {
  for (const subject of ['x'.repeat(256), ' fixture ', 'fixture\u0000subject']) {
    await assert.rejects(verifyIdentity(await token(subject)), AuthFailure);
  }
  const service = createHouseholdService({ $transaction: () => assert.fail('Must not reach the database') });
  await assert.rejects(service.bootstrap({ id: 'x'.repeat(256) }), AuthFailure);
});
