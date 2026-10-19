import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performAccountDeletion, createAccountDeletionApi } from '../lib/accountDeletion.ts';
const input = { email: 'fixture@example.test', confirmation: 'DELETE', password: 'private-fixture-password' };
function fixture({ state = 'READY', fail = '' } = {}) {
  const calls = [];
  const step = name => async () => { calls.push(name); if (fail === name) throw Error('private-provider-body'); };
  const io = { review: async () => ({ state, counts: { groceries: 1, events: 1, receipts: 0 } }),
    verifyPassword: step('verify'), removeData: step('data'), clearDevice: step('device'), deleteUser: step('provider'), dataDeleted: () => calls.push('ack') };
  return { io, calls };
}
test('wrong confirmation, shared household and wrong password cannot delete any data', async () => {
  for (const options of [{ state: 'SHARED_HOUSEHOLD' }, { fail: 'verify' }]) {
    const h = fixture(options); await assert.rejects(performAccountDeletion(input, h.io));
    assert.equal(h.calls.includes('data'), false); assert.equal(h.calls.includes('provider'), false);
  }
  const h = fixture(); await assert.rejects(performAccountDeletion({ ...input, confirmation: 'delete' }, h.io)); assert.deepEqual(h.calls, []);
});
test('successful deletion verifies password before data, clears device before provider and acknowledges every stage', async () => {
  const h = fixture(); await performAccountDeletion(input, h.io);
  assert.deepEqual(h.calls, ['verify', 'data', 'ack', 'device', 'provider']);
});
test('uncertain data deletion never requests provider deletion; partial stages preserve safe retry semantics', async () => {
  const data = fixture({ fail: 'data' }); await assert.rejects(performAccountDeletion(input, data.io)); assert.deepEqual(data.calls, ['verify', 'data']);
  for (const [fail, code] of [['device', 'DELETION_DEVICE'], ['provider', 'DELETION_PROVIDER']]) {
    const h = fixture({ fail }); await assert.rejects(performAccountDeletion(input, h.io), e => e.code === code && !e.message.includes('private-provider'));
    assert.ok(h.calls.includes('ack'));
    if (fail === 'device') assert.equal(h.calls.includes('provider'), false);
  }
  const retry = fixture({ state: 'DATA_DELETED' }); await performAccountDeletion(input, retry.io);
  assert.deepEqual(retry.calls, ['verify', 'ack', 'device', 'provider']);
});
test('API sends only confirmation/email and fresh bearer; malformed/provider errors do not leak response content', async () => {
  const calls = []; let tokens = 0;
  const api = createAccountDeletionApi('https://api.example.test', async () => `token-${++tokens}`, false, async (url, options) => {
    calls.push({ url, ...options }); return Response.json({ data: options.method === 'GET'
      ? { state: 'READY', counts: { groceries: 2, events: 3, receipts: 0 } } : { state: 'DATA_DELETED' } });
  });
  assert.equal((await api.review()).counts.groceries, 2); await api.removeData(input.email, input.confirmation);
  assert.deepEqual(JSON.parse(calls[1].body), { email: input.email, confirmation: 'DELETE' });
  assert.equal(calls[1].headers.Authorization, 'Bearer token-2'); assert.equal(calls[1].credentials, 'omit'); assert.equal(calls[1].redirect, 'error');
  for (const response of [Response.json({ data: { state: 'READY', counts: { groceries: -1 } } }), Response.json({ error: { message: 'private-driver-url' } }, { status: 503 })]) {
    const broken = createAccountDeletionApi('https://api.example.test', async () => 'fixture', false, async () => response);
    await assert.rejects(broken.review(), e => !e.message.includes('private-driver'));
  }
});
