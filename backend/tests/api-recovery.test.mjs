import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createPantryApi } from '../../lib/pantryApi.ts';
import { cacheablePantryFailure } from '../../lib/pantryReadCache.ts';
const require = createRequire(import.meta.url);
const { createApp } = require('../dist/app.js');
const { PantryFailure } = require('../dist/services/pantry.js');
const { AuthFailure } = require('../dist/services/auth.js');

const identity = { id: 'fixture-recovery', email: 'fixture@example.test', name: 'Fixture' };
const token = 'fixture.bearer.only';
const entry = { name: 'Recovery Fixture Milk', category: 'DAIRY', quantity: '0.5', unit: 'l',
  expiresOn: '2026-10-25', totalCostMinor: 6050 };
async function serve(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${server.address().port}`;
}
const verifyIdentity = async value => {
  if (value !== token) throw new AuthFailure();
  return identity;
};

test('mobile client recovers from a real Express 503 response and marks subsequent 401 ineligible for cached fallback', async t => {
  let available = false, authorized = true, calls = 0;
  const result = { items: [], pagination: { page: 1, pageSize: 50, total: 0, hasNextPage: false }, inventory: { active: 0, categories: {} } };
  const origin = await serve(t, {
    verifyIdentity: async value => { if (!authorized) throw new AuthFailure(); return verifyIdentity(value); },
    pantryService: { list: async (user, pagination) => {
      calls++; assert.equal(user.id, identity.id); assert.equal(pagination.page, 1);
      if (!available) throw new PantryFailure('PANTRY_UNAVAILABLE');
      return result;
    } },
  });
  const api = createPantryApi(origin, async () => token, true);
  await assert.rejects(api.list(), error => error.code === 'PANTRY_HTTP_503' && cacheablePantryFailure(error.code));
  assert.equal(calls, 1); // No automatic request storm during an outage.
  available = true;
  assert.deepEqual((await api.list()).data, result); assert.equal(calls, 2);
  authorized = false;
  await assert.rejects(api.list(), error => error.code === 'PANTRY_HTTP_401' && !cacheablePantryFailure(error.code));
  assert.equal(calls, 2); // Authentication rejects before the data service.
});

test('explicit mobile retry after Express 503 preserves validated fields and the original mutation key', async t => {
  const calls = [];
  const origin = await serve(t, { verifyIdentity, pantryService: { create: async (user, input, key) => {
    calls.push({ subject: user.id, input, key });
    if (calls.length === 1) throw new PantryFailure('PANTRY_UNAVAILABLE');
    return { id: 'fixture-item', ...input };
  } } });
  const api = createPantryApi(origin, async () => token, true), key = 'recovery-retry-key-12345';
  await assert.rejects(api.add(entry, key), { code: 'PANTRY_HTTP_503' });
  assert.equal(calls.length, 1);
  assert.equal((await api.add(entry, key)).data.item.quantity, '0.5');
  assert.deepEqual(calls, [{ subject: identity.id, input: entry, key }, { subject: identity.id, input: entry, key }]);
});

test('a lost successful HTTP response reports uncertainty and an explicit retry sends identical request bytes/key', async t => {
  let serviceCalls = 0, drop = true;
  const wire = [];
  const origin = await serve(t, { verifyIdentity, pantryService: { create: async (_user, input) => {
    serviceCalls++; return { id: 'fixture-item', ...input };
  } } });
  const api = createPantryApi(origin, async () => token, true, async (url, options) => {
    const sent = { method: options.method, body: options.body, key: options.headers['Idempotency-Key'] };
    wire.push(sent);
    const response = await fetch(url, options); sent.status = response.status;
    if (drop) {
      drop = false; await response.arrayBuffer();
      throw new TypeError('fixture-private-transport-details');
    }
    return response;
  });
  const key = 'lost-response-key-12345';
  await assert.rejects(api.add(entry, key), error => error.code === 'PANTRY_NETWORK'
    && error.message.includes('A save may have completed') && !error.message.includes('fixture-private'));
  assert.equal(serviceCalls, 1); assert.equal(wire[0].status, 200);
  assert.equal((await api.add(entry, key)).data.item.totalCostMinor, 6050);
  assert.equal(serviceCalls, 2); assert.deepEqual(wire[0], wire[1]);
  // The service is a spy, not a database: this proves transport identity and safe
  // retry wording, not exactly-once persistence. Guarded live service tests cover that.
});
