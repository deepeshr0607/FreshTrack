import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBackendIdentity } from '../lib/backendIdentity.ts';
import { createNeonAuth } from '../lib/neonAuth.ts';
const user = { id: 'provider-user', email: 'native@example.com', name: 'Native' };
const endpoint = 'https://development.neonauth.neon.tech/neondb/auth';
test('API token comes from authenticated documented /token endpoint, without persistence', async () => {
  const auth = createNeonAuth(endpoint, { get: async () => 'neon-auth.session_token=signed', set: async () => assert.fail('JWT must not be persisted'), clear: async () => {} }, async (url, options) => {
    assert.equal(url, `${endpoint}/token`); assert.equal(options.headers.Cookie, 'neon-auth.session_token=signed');
    return Response.json({ token: 'header.payload.signature' });
  }, 'http://192.168.1.21:8085');
  assert.equal(await auth.getApiToken(), 'header.payload.signature');
});
test('no session cannot obtain API token or call provider', async () => {
  const auth = createNeonAuth(endpoint, { get: async () => null }, async () => assert.fail('unexpected network'), 'http://192.168.1.21:8085');
  await assert.rejects(auth.getApiToken(), { code: 'UNAUTHORIZED' });
});
test('backend check uses only bearer JWT and requires matching verified identity', async () => {
  await checkBackendIdentity('https://api.example.com', async () => 'signed-jwt', user, false, async (url, options) => {
    assert.equal(url, 'https://api.example.com/api/v1/auth/me');
    assert.deepEqual(options.headers, { Authorization: 'Bearer signed-jwt' });
    assert.equal(options.redirect, 'error');
    return Response.json({ data: { user } });
  });
  await assert.rejects(checkBackendIdentity('https://api.example.com', async () => 'jwt', user, false,
    async () => Response.json({ data: { user: { ...user, id: 'other' } } })), { code: 'API_IDENTITY' });
});
test('configuration rejects insecure/public HTTP before obtaining credentials', async () => {
  for (const url of [undefined, 'http://public.example.com', 'https://name:password@api.example.com', 'https://api.example.com/path']) {
    await assert.rejects(checkBackendIdentity(url, async () => assert.fail('unexpected credential access'), user, true), { code: 'API_CONFIG' });
  }
});
test('LAN HTTP is development-only and provider/API errors do not expose credentials', async () => {
  await assert.rejects(checkBackendIdentity('http://192.168.1.21:3001', async () => 'jwt', user), { code: 'API_CONFIG' });
  for (const status of [401, 503]) await assert.rejects(checkBackendIdentity('http://192.168.1.21:3001', async () => 'jwt', user, true,
    async () => Response.json({ secret: 'private' }, { status })), { code: status === 401 ? 'API_UNAUTHORIZED' : 'API_UNAVAILABLE' });
  await assert.rejects(checkBackendIdentity('https://api.example.com', async () => 'jwt', user, false,
    async () => { throw new Error('private-session'); }), { code: 'API_NETWORK' });
});
