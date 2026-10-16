import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptImportStorage, createReceiptImportController, cleanReceiptInput, reviewedReceiptInput, receiptImportScope, receiptImportStorageKey, bindReceiptImportSession } from '../lib/receiptImport.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';
const fields = { name: 'Review Milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20', totalCostMinor: 6050 };
const input = { items: [{ rowId: 'milk', item: fields }, { rowId: 'bread', item: { ...fields, name: 'Review Bread', category: 'BAKERY', quantity: '1', unit: 'loaf', totalCostMinor: null } }] };
const result = (body, replayed = false) => ({ receiptScanId: '11111111-1111-4111-8111-111111111111', replayed,
  items: body.items.map((row, index) => ({ ...row.item, id: `22222222-2222-4222-8222-22222222222${index}`, status: 'ACTIVE', source: 'RECEIPT', expirySource: 'USER_ENTERED', currencyCode: 'INR', daysLeft: 4, freshness: 'fresh', createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-10-16T00:00:00.000Z' })) });
const review = body => ({ rows: body.items.map(row => ({ rowId: row.rowId, matches: [], total: 0, withinHaul: [] })) });
function memory() { const values = new Map(); return { values, io: { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } } }; }
function setup(extra = {}, storage) {
  const mem = memory(); storage ??= createReceiptImportStorage(mem.io, 'branch:account');
  let calls = [];
  const ctrl = createReceiptImportController({ storage, active: () => true, review: async body => review(body), send: async (body, key) => { calls.push({ body, key }); return result(body); }, ...extra }, () => 'receipt-key-123456789');
  return { ctrl, mem, storage, calls };
}
test('review handoff whitelists selected confirmed fields, preserving unknown and free values without OCR', () => {
  const row = { id: 'milk', original: 'PRIVATE OCR', selected: true, reviewed: true, draft: { name: 'Milk', category: 'Dairy', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20', price: '60.50' } };
  const out = reviewedReceiptInput([row, { ...row, id: 'skip', selected: false }]);
  assert.equal(out.items.length, 1); assert.equal(out.items[0].item.totalCostMinor, 6050); assert.doesNotMatch(JSON.stringify(out), /PRIVATE|original|draft/);
  for (const price of ['', '0']) assert.equal(reviewedReceiptInput([{ ...row, draft: { ...row.draft, price } }]).items[0].item.totalCostMinor, price === '' ? null : 0);
  assert.throws(() => reviewedReceiptInput([{ ...row, reviewed: false }]));
  for (const extra of [{ rawText: 'private' }, { userId: 'foreign' }, { image: 'file://photo' }]) assert.throws(() => cleanReceiptInput({ ...input, ...extra }));
  assert.throws(() => cleanReceiptInput({ items: [{ rowId: 'bad', item: { ...fields, token: 'private' } }] }));
});
test('chunked immutable intent survives restart with Unicode/full20 rows; another account cannot read it', async () => {
  const mem = memory(), scope = receiptImportScope('branch-one', 'account-a'), store = createReceiptImportStorage(mem.io, scope);
  const body = { confirmed: true, items: Array.from({ length: 20 }, (_, index) => ({ rowId: `row-${index}`, item: { ...fields, name: '🥛'.repeat(40), unit: 'l' } })) };
  await store.save(body, 'receipt-key-123456789', true);
  for (const value of mem.values.values()) assert.ok(Buffer.byteLength(value) <= 2000);
  const restored = await createReceiptImportStorage(mem.io, scope).load(); assert.equal(restored.input.items.length, 20); assert.equal(restored.paused, true);
  assert.equal(await createReceiptImportStorage(mem.io, receiptImportScope('branch-one', 'account-b')).load(), null);
  assert.equal(await createReceiptImportStorage(mem.io, receiptImportScope('branch-two', 'account-a')).load(), null);
  await assert.rejects(store.save({ ...input, confirmed: true }, 'receipt-key-different', false));
  assert.equal((await store.load()).key, restored.key);
  await store.clear(restored.key); assert.equal(mem.values.size, 0);
});
test('partial storage write publishes no intent and sends nothing; errors redact storage details', async () => {
  const mem = memory(); let fail = true, sends = 0;
  const storage = createReceiptImportStorage({ ...mem.io, set: async (key, value) => { if (fail && key === receiptImportStorageKey('branch:account')) throw Error('private native receipt path'); await mem.io.set(key, value); } }, 'branch:account');
  const { ctrl } = setup({ send: async body => { sends++; return result(body); } }, storage);
  await ctrl.restore(); await ctrl.review(input); await ctrl.confirm();
  assert.equal(sends, 0); assert.equal(await storage.load(), null); assert.doesNotMatch(ctrl.getSnapshot().error, /private|native/);
  fail = false; await ctrl.confirm(); assert.equal(sends, 1); assert.equal(ctrl.getSnapshot().stage, 'saved');
});
test('confirmation double taps coalesce; lost server response retries exact frozen input/key after restart', async () => {
  let release, calls = [], lose = true;
  const { ctrl, storage } = setup({ send: async (body, key) => { calls.push({ body: structuredClone(body), key }); if (lose) { await new Promise(resolve => { release = resolve; }); throw new NeonAuthError('PANTRY_NETWORK', 'Unable to reach pantry.'); } return result(body, true); } });
  await ctrl.restore(); const mutable = structuredClone(input); await ctrl.review(mutable); mutable.items[0].item.name = 'MUTATED';
  const first = ctrl.confirm(); await ctrl.confirm();
  while (!release) await new Promise(resolve => setTimeout(resolve, 0)); release(); await first;
  assert.equal(calls.length, 1); assert.equal(ctrl.getSnapshot().stage, 'pending'); assert.doesNotMatch(JSON.stringify(calls[0]), /MUTATED/);
  lose = false;
  const restored = setup({ send: async (body, key) => { calls.push({ body, key }); return result(body, true); } }, storage).ctrl;
  await restored.restore(); assert.equal(calls.length, 1); assert.equal(restored.getSnapshot().stage, 'pending');
  await restored.retry(); assert.deepEqual(calls[1], calls[0]); assert.equal(restored.getSnapshot().result.replayed, true); assert.equal(await storage.load(), null);
});
test('cancel never persists/sends; duplicate Skip and Add Separately preserve chosen exact payload', async () => {
  const matched = body => ({ rows: body.items.map(row => ({ rowId: row.rowId, total: 0, matches: [], withinHaul: body.items.filter(other => other.rowId !== row.rowId).map(other => other.rowId) })) });
  const { ctrl, storage, calls } = setup({ review: async body => matched(body) });
  await ctrl.restore(); await ctrl.review(input); ctrl.cancel(); assert.equal(await storage.load(), null); assert.equal(calls.length, 0);
  await ctrl.review(input); await ctrl.confirm(); assert.match(ctrl.getSnapshot().error, /Choose Skip/); assert.equal(calls.length, 0);
  ctrl.choose('milk', 'skip'); ctrl.choose('bread', 'skip'); await ctrl.confirm(); assert.match(ctrl.getSnapshot().error, /All groceries/);
  ctrl.choose('milk', 'separate'); await ctrl.confirm(); assert.equal(calls[0].body.items.length, 1);
  assert.equal(calls[0].body.items[0].rowId, 'milk'); assert.deepEqual(calls[0].body.items[0].item.duplicateConfirmation, { confirmed: true, action: 'add_separately' });
});
test('paused diagnostic persists across restart; repeated retries send nothing until explicit end', async () => {
  const { ctrl, storage, calls } = setup(); await ctrl.restore(); await ctrl.review(input); await ctrl.confirm(true);
  await ctrl.retry(); await ctrl.retry(); assert.equal(calls.length, 0); assert.equal((await storage.load()).paused, true);
  const restored = setup({}, storage); await restored.ctrl.restore(); await restored.ctrl.retry(); assert.equal(restored.calls.length, 0);
  await restored.ctrl.retry(true); assert.equal(restored.calls.length, 1); assert.equal(await storage.load(), null);
});
test('new duplicate after preflight releases only a known rolled-back attempt and demands fresh choices', async () => {
  let reviewCount = 0;
  const { ctrl, storage } = setup({ review: async body => { reviewCount++; return review(body); }, send: async () => { throw new NeonAuthError('PANTRY_DUPLICATE', 'Review new duplicate.'); } });
  await ctrl.restore(); await ctrl.review(input); await ctrl.confirm();
  assert.equal(await storage.load(), null); assert.equal(ctrl.getSnapshot().stage, 'review'); assert.equal(reviewCount, 2); assert.deepEqual(ctrl.getSnapshot().choices, {});
});
test('malformed success and cleanup failures retain exact retry rather than reporting success', async () => {
  const { ctrl, storage } = setup({ send: async body => ({ ...result(body), items: [] }) });
  await ctrl.restore(); await ctrl.review(input); await ctrl.confirm(); assert.equal(ctrl.getSnapshot().stage, 'pending'); assert.ok(await storage.load());
  const mem = memory(); let clearFails = true;
  const failing = createReceiptImportStorage({ ...mem.io, remove: async key => { if (clearFails) throw Error('private'); await mem.io.remove(key); } }, 'cleanup:account');
  const restored = setup({}, failing); await restored.ctrl.restore(); await restored.ctrl.review(input); await restored.ctrl.confirm();
  assert.equal(restored.ctrl.getSnapshot().stage, 'pending'); assert.ok(await failing.load()); clearFails = false; await restored.ctrl.retry(); assert.equal(restored.ctrl.getSnapshot().stage, 'saved');
});
test('leaving and restoring during an in-flight result preserves pending retry and discards late UI updates', async () => {
  let release;
  const { ctrl, storage } = setup({ send: body => new Promise(resolve => { release = () => resolve(result(body)); }) });
  await ctrl.restore(); await ctrl.review(input); const saving = ctrl.confirm();
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  ctrl.leave(); const restoring = ctrl.restore(); release(); await saving; await restoring;
  assert.equal(ctrl.getSnapshot().stage, 'pending'); assert.ok(await storage.load());
});
test('sign-out/account switch invalidate queued local writes; transient checking preserves them', async () => {
  const mem = memory(); let unblock;
  const io = { ...mem.io, set: async (key, value) => { if (key.endsWith('.0')) await new Promise(resolve => { unblock = resolve; }); await mem.io.set(key, value); } };
  const store = createReceiptImportStorage(io, 'account:a');
  let state = { checking: false, status: 'authenticated', user: { id: 'a' } }, listener;
  const cleared = []; const stop = bindReceiptImportSession({ getSnapshot: () => state, subscribe: fn => { listener = fn; return () => {}; } }, id => { cleared.push(id); return store.clear(); });
  const saving = store.save({ ...input, confirmed: true }, 'receipt-key-123456789', false);
  while (!unblock) await new Promise(resolve => setTimeout(resolve, 0));
  state = { ...state, checking: true, user: null }; listener(); assert.deepEqual(cleared, []);
  state = { checking: false, status: 'anonymous', user: null }; listener(); unblock(); await assert.rejects(saving);
  assert.equal(await store.load(), null); assert.deepEqual(cleared, ['a']); assert.equal(mem.values.size, 0); stop();
  assert.notEqual(receiptImportStorageKey('account:a'), receiptImportStorageKey('account:b'));
});
test('corrupt or missing saved chunks block restoration without sending or discarding uncertainty', async () => {
  const { ctrl, storage, mem, calls } = setup(); await storage.save({ ...input, confirmed: true }, 'receipt-key-123456789', false);
  const prefix = receiptImportStorageKey('branch:account'); mem.values.delete(prefix + '.0'); await ctrl.restore();
  assert.equal(ctrl.getSnapshot().ready, false); assert.ok(ctrl.getSnapshot().error); assert.equal(calls.length, 0); assert.ok(mem.values.has(prefix));
});
test('session checking after persistence blocks transport until the same account is verified again', async () => {
  let active = true, sent = 0;
  const mem = memory(), original = createReceiptImportStorage(mem.io, 'checking:account');
  const storage = { ...original, save: async (...args) => { const value = await original.save(...args); active = false; return value; } };
  const { ctrl } = setup({ active: () => active, send: async body => { sent++; return result(body); } }, storage);
  await ctrl.restore(); await ctrl.review(input); await ctrl.confirm(); assert.equal(sent, 0); assert.ok(await original.load());
  active = true; await ctrl.restore(); assert.equal(ctrl.getSnapshot().stage, 'pending'); assert.equal(sent, 0);
  await ctrl.retry(); assert.equal(sent, 1); assert.equal(await original.load(), null);
});
