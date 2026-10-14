import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationOutbox, notificationOutboxKey } from '../lib/notificationOutbox.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';
import { createPantryApi, requirePantryStatus } from '../lib/pantryApi.ts';
const scope = '["https://development.neon.tech/auth","account-a"]';
const row = (n = 1) => ({ id: `11111111-1111-1111-1111-${String(n).padStart(12, '0')}`, action: 'consume',
  key: `request-stable-${n}`, expectedUpdatedAt: '2026-10-14T08:00:00.000Z' });
function harness(storage = { raw: null }, extra = {}) {
  let active = true; const sent = [], acknowledgements = [];
  const io = { read: async () => storage.raw, write: async raw => { storage.raw = raw; }, active: () => active,
    send: async value => { sent.push(value); }, acknowledged: async id => { acknowledgements.push(id); }, ...extra };
  return { queue: createNotificationOutbox(scope, io, true), io, storage, sent, acknowledgements, active: value => { active = value; } };
}
test('confirmation is durable before sending; acknowledged outcomes remove the pending entry', async () => {
  const h = harness(); h.io.send = async value => { assert.equal(JSON.parse(h.storage.raw).entries[0].key, value.key); h.sent.push(value); };
  await h.queue.confirm(row()); await h.queue.flush();
  assert.equal(h.sent.length, 1); assert.equal(h.queue.getSnapshot().entries.length, 0);
  assert.deepEqual(h.acknowledgements, [row().id]);
});
test('transport failure preserves the exact body/key across process restart and recovery', async () => {
  const store = { raw: null };
  const h = harness(store, { send: async () => { throw new NeonAuthError('PANTRY_NETWORK', 'unavailable'); } });
  await h.queue.confirm(row()); await h.queue.flush(); assert.equal(h.queue.getSnapshot().entries.length, 1);
  const next = harness(store); await next.queue.flush();
  assert.deepEqual(next.sent[0], { ...row(), blocked: false }); assert.equal(JSON.parse(store.raw).entries.length, 0);
});
test('lost acknowledgement cleanup replays the same key rather than generating a second action', async () => {
  const h = harness(); let writes = 0;
  h.io.write = async raw => { writes++; if (writes === 2) throw Error('device storage failure'); h.storage.raw = raw; };
  await h.queue.confirm(row()); await h.queue.flush();
  assert.equal(h.sent.length, 2); assert.equal(h.sent[0].key, h.sent[1].key);
  assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('confirmation storage failure sends nothing and does not publish an unsaved outcome', async () => {
  const h = harness(null, { read: async () => null, write: async () => { throw Error('disk full'); } });
  await assert.rejects(h.queue.confirm(row()), error => error.code === 'OUTBOX_STORAGE');
  assert.equal(h.sent.length, 0); assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('conflicts are retained for review; repeated resume does not retry a blocked entry', async () => {
  const h = harness(); h.io.send = async value => { h.sent.push(value); throw new NeonAuthError('PANTRY_HTTP_409', 'changed'); };
  await h.queue.confirm(row()); await h.queue.flush(); await h.queue.flush();
  assert.equal(h.sent.length, 1); assert.equal(h.queue.getSnapshot().entries[0].blocked, true);
  await h.queue.discard(row().key); assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('missing/invalid/superseded outcomes require review rather than blind retry', async () => {
  for (const code of ['PANTRY_HTTP_400', 'PANTRY_HTTP_404', 'PANTRY_CHANGED']) {
    const h = harness(undefined, { send: async () => { throw new NeonAuthError(code, 'rejected'); } });
    await h.queue.confirm(row()); await h.queue.flush(); assert.equal(h.queue.getSnapshot().entries[0].blocked, true);
  }
});
test('auth/availability failure remains pending and can recover after verified login', async () => {
  const h = harness(); let failed = true; h.io.send = async value => { if (failed) throw new NeonAuthError('PANTRY_HTTP_401', 'rejected'); h.sent.push(value); };
  await h.queue.confirm(row()); await h.queue.flush(); assert.equal(h.queue.getSnapshot().entries[0].blocked, false);
  failed = false; await h.queue.flush(); assert.equal(h.sent.length, 1);
});
test('signed-out or checking states do not enqueue/send; pending survives for matching identity', async () => {
  const h = harness(); await h.queue.pause(true); await h.queue.confirm(row()); await h.queue.flush();
  h.active(false); await h.queue.flush(); await assert.rejects(h.queue.confirm(row(2)), error => error.code === 'UNAUTHORIZED');
  assert.equal(h.sent.length, 0); assert.equal(h.queue.getSnapshot().entries.length, 1);
  h.active(true); await h.queue.pause(false); assert.equal(h.sent.length, 1);
});
test('auth loss during an in-flight request retains an identical replay until verified recovery', async () => {
  const h = harness(); let release, entered;
  const start = new Promise(resolve => { entered = resolve; });
  h.io.send = async value => { h.sent.push(value); entered(); await new Promise(resolve => { release = resolve; }); };
  await h.queue.confirm(row()); await start; h.active(false); release(); await h.queue.flush();
  assert.equal(h.queue.getSnapshot().entries.length, 1);
  h.active(true); h.io.send = async value => { h.sent.push(value); }; await h.queue.flush();
  assert.equal(h.sent.length, 2); assert.deepEqual(h.sent[0], h.sent[1]);
});
test('diagnostic pause persists across restart and release syncs once; production ignores the pause', async () => {
  const h = harness(); await h.queue.pause(true); await h.queue.confirm(row()); await h.queue.flush();
  const next = harness(h.storage); await next.queue.flush(); assert.equal(next.queue.getSnapshot().paused, true); assert.equal(next.sent.length, 0);
  await next.queue.pause(false); assert.equal(next.sent.length, 1);
  const restored = JSON.parse(h.storage.raw); restored.paused = true; restored.entries = [{ ...row(2), blocked: false }]; h.storage.raw = JSON.stringify(restored);
  const prod = createNotificationOutbox(scope, h.io); await prod.flush(); assert.equal(prod.getSnapshot().paused, false);
});
test('duplicate/conflicting confirmations for one item do not replace a saved request', async () => {
  const h = harness(); await h.queue.pause(true); await h.queue.confirm(row());
  await assert.rejects(h.queue.confirm({ ...row(), action: 'waste', key: 'request-new-choice' }), error => error.code === 'OUTBOX_PENDING');
  assert.equal(h.queue.getSnapshot().entries[0].action, 'consume');
});
test('queue is bounded and serialized; a sixth action cannot overwrite the first five', async () => {
  const h = harness(); await h.queue.pause(true);
  await Promise.all(Array.from({ length: 5 }, (_, n) => h.queue.confirm(row(n + 1))));
  await assert.rejects(h.queue.confirm(row(6)), error => error.code === 'OUTBOX_FULL');
  assert.equal(h.queue.getSnapshot().entries.length, 5); assert.ok(h.storage.raw.length <= 2000);
});
test('foreign scopes, corrupted storage and malformed entries fail closed without erasure or send', async () => {
  for (const raw of ['not-json', JSON.stringify({ version: 1, scope: 'foreign', paused: false, entries: [] }),
    JSON.stringify({ version: 1, scope, paused: false, entries: [{ ...row(), id: '../invalid', blocked: false }] })]) {
    const h = harness({ raw }); await h.queue.flush();
    assert.equal(h.queue.getSnapshot().ready, false); assert.equal(h.sent.length, 0); assert.equal(h.storage.raw, raw);
  }
});
test('saved actions whitelist fields and scope keys cannot collide through punctuation removal', async () => {
  const h = harness(); await h.queue.pause(true); await h.queue.confirm({ ...row(), token: 'private-token' });
  assert.ok(!h.storage.raw.includes('private-token')); assert.notEqual(notificationOutboxKey('a:b'), notificationOutboxKey('ab'));
  assert.match(notificationOutboxKey(scope), /^[a-zA-Z0-9._-]+$/);
});
test('forgetting a retry during an in-flight send is blocked; list-refresh failure never resends an acknowledged outcome', async () => {
  const h = harness(); let entered, release; const start = new Promise(resolve => { entered = resolve; });
  h.io.send = async () => { entered(); await new Promise(resolve => { release = resolve; }); };
  h.io.acknowledged = async () => { throw Error('refresh unavailable'); };
  await h.queue.confirm(row()); await start;
  await assert.rejects(h.queue.discard(row().key), error => error.code === 'OUTBOX_BUSY');
  release(); await h.queue.flush(); assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('real API adapter replays the original key/body after a lost HTTP response without another simulated event', async () => {
  const calls = [], events = new Set(); let loseResponse = true;
  const api = createPantryApi('https://api.example.com', async () => 'transient-test-token', false, async (url, init) => {
    calls.push({ url, key: init.headers['Idempotency-Key'], body: init.body });
    events.add(init.headers['Idempotency-Key']);
    if (loseResponse) { loseResponse = false; throw Error('connection lost after commit'); }
    return new Response(JSON.stringify({ data: { item: { status: 'WASTED' } } }), { status: 200 });
  });
  const h = harness(undefined, { send: async value => {
    const item = (await api.outcome(value.id, value.action, { confirmed: true, expectedUpdatedAt: value.expectedUpdatedAt }, value.key)).data.item;
    requirePantryStatus([item], 'WASTED');
  } });
  await h.queue.confirm({ ...row(), action: 'waste' }); await h.queue.flush();
  assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]); assert.equal(events.size, 1);
  assert.ok(calls[0].url.endsWith('/waste')); assert.equal(JSON.parse(calls[0].body).confirmed, true);
  assert.ok(!h.storage.raw.includes('transient-test-token')); assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('a new confirmation during an earlier send is preserved when the first acknowledgement commits', async () => {
  const h = harness(); let entered, release; const start = new Promise(resolve => { entered = resolve; });
  h.io.send = async value => { h.sent.push(value); if (value.id === row().id) { entered(); await new Promise(resolve => { release = resolve; }); } };
  await h.queue.confirm(row()); await start; await h.queue.confirm(row(2)); release(); await h.queue.flush();
  assert.equal(h.sent.length, 2); assert.equal(h.queue.getSnapshot().entries.length, 0);
});
test('malformed input and excessive encoded storage bytes never overwrite a saved queue', async () => {
  const h = harness(); await h.queue.pause(true);
  await assert.rejects(h.queue.confirm({ ...row(), expectedUpdatedAt: 'yesterday' }));
  assert.equal(h.queue.getSnapshot().entries.length, 0);
  const wide = createNotificationOutbox('界'.repeat(400), { ...h.io, read: async () => null }, true);
  await assert.rejects(wide.confirm(row()), error => error.code === 'OUTBOX_FULL');
  assert.equal(JSON.parse(h.storage.raw).scope, scope); assert.equal(h.sent.length, 0);
});
