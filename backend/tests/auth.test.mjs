import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose';
import appModule from '../dist/app.js';
import authModule from '../dist/services/auth.js';

const { createApp } = appModule;
const { createIdentityVerifier, AuthFailure } = authModule;
const url = 'https://development.neonauth.neon.tech/neondb/auth';
const issuer = new URL(url).origin;
const keys = await generateKeyPair('EdDSA');
const jwk = await exportJWK(keys.publicKey);
const verify = createIdentityVerifier(url, createLocalJWKSet({ keys: [{ ...jwk, kid: 'dev' }] }));
const app = createApp({ verifyIdentity: verify });
const claims = { email: 'native@example.com', name: 'Native User', emailVerified: true, id: 'provider-user', banned: false };
async function token(overrides = {}, options = {}) {
  return new SignJWT({ ...claims, ...overrides }).setProtectedHeader({ alg: options.alg || 'EdDSA', kid: options.kid || 'dev' })
    .setSubject(options.sub || 'provider-user').setIssuer(options.issuer || issuer).setAudience(options.audience || issuer)
    .setIssuedAt(options.iat ?? Math.floor(Date.now() / 1000)).setExpirationTime(options.exp || '15m')
    .sign(options.key || keys.privateKey);
}
test('verified subject is returned; client userId and request ID cannot replace identity', async () => {
  const res = await request(app).get('/api/v1/auth/me?userId=someone-else')
    .set('x-request-id', 'untrusted').set('Authorization', `Bearer ${await token()}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { data: { user: { id: 'provider-user', email: claims.email, name: claims.name } } });
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(JSON.stringify(res.body).includes('token'), false);
});
test('missing, malformed, opaque session, cookie-only and fake user headers are rejected', async () => {
  for (const authorization of ['', 'Basic credential', 'Bearer opaque-session', 'Bearer a.b.c', 'Bearer a.b.c extra']) {
    let req = request(app).get('/api/v1/auth/me').set('Cookie', 'neon-auth.session_token=untrusted').set('x-user-id', 'provider-user');
    if (authorization) req = req.set('Authorization', authorization);
    const res = await req;
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
    assert.equal(typeof res.body.error.requestId, 'string');
    assert.equal(res.headers['www-authenticate'], 'Bearer');
    assert.equal(JSON.stringify(res.body).includes('untrusted'), false);
  }
});
test('expired, wrong branch issuer/audience, future, stale and unknown-key JWTs fail', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const options of [{ exp: now - 60 }, { issuer: 'https://other.neon.tech' }, { audience: 'other-api' },
    { iat: now + 100 }, { iat: now - 1000 }, { kid: 'unknown' }]) {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${await token({}, options)}`);
    assert.equal(res.status, 401);
  }
});
test('bad signature and algorithm cannot bypass verification', async () => {
  const other = await generateKeyPair('EdDSA');
  const forged = await token({}, { key: other.privateKey });
  const symmetric = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('a'.repeat(32)));
  for (const jwt of [forged, symmetric]) assert.equal((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${jwt}`)).status, 401);
});
test('unverified, banned, mismatched subject, absent email and absent expiry fail', async () => {
  for (const overrides of [{ emailVerified: false }, { banned: true }, { id: 'different' }, { email: null }]) {
    assert.equal((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${await token(overrides)}`)).status, 401);
  }
  const missing = await new SignJWT(claims).setProtectedHeader({ alg: 'EdDSA', kid: 'dev' }).setSubject('provider-user')
    .setIssuer(issuer).setAudience(issuer).setIssuedAt().sign(keys.privateKey);
  await assert.rejects(verify(missing), AuthFailure);
});
test('invalid server config and JWKS outage fail closed without leaking provider errors', async () => {
  for (const verifier of [createIdentityVerifier('http://unsafe.example/auth'), createIdentityVerifier(url, async () => { throw new Error('private-provider-data'); })]) {
    const res = await request(createApp({ verifyIdentity: verifier })).get('/api/v1/auth/me').set('Authorization', `Bearer ${await token()}`);
    assert.equal(res.status, 503); assert.equal(res.body.error.code, 'AUTH_UNAVAILABLE');
    assert.equal(JSON.stringify(res.body).includes('private-provider-data'), false);
  }
});
test('health stays public and unsupported auth methods remain unavailable', async () => {
  assert.equal((await request(app).get('/api/v1/health')).status, 200);
  assert.equal((await request(app).post('/api/v1/auth/me').send({ userId: 'provider-user' })).status, 404);
});
