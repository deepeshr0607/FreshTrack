import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPantryDiskCache } from '../lib/pantryDiskCache.ts';
const at = Date.parse('2026-10-12T12:00:00Z'), owner = 'branch-a:user-a';
const id = n => `11111111-1111-1111-1111-${String(n).padStart(12, '0')}`;
const item = (n = 1, fields = {}) => ({ id: id(n), name: 'Milk', category: 'DAIRY', quantity: '0.5', unit: 'l', expiresOn: '2026-10-20',
  totalCostMinor: 6050, status: 'ACTIVE', source: 'MANUAL', expirySource: 'USER_ENTERED', currencyCode: 'INR',
  createdAt: new Date(at).toISOString(), updatedAt: new Date(at).toISOString(), daysLeft: 8, freshness: 'fresh', ...fields });
function harness() {
  const values = new Map(); let fail = false;
  const storage = { get: async key => values.get(key) ?? null, set: async (key, value) => { if (fail && /\.\d+$/.test(key)) throw Error('private-storage-error'); values.set(key, value); }, remove: async key => { values.delete(key); } };
  return { values, storage, fail: () => { fail = true; } };
}
test('snapshot round-trip is bounded, exact, Unicode safe and strips response extras', async () => {
  const h = harness(), disk = createPantryDiskCache(h.storage, () => at);
  await disk.save(owner, { savedAt: at, items: Array.from({ length: 25 }, (_, n) => item(n, { name: '🥬'.repeat(50), token: 'never-store-token', cookie: 'never-store-cookie' })) });
  const restarted = createPantryDiskCache(h.storage, () => at);
  const saved = await restarted.load(owner);
  assert.equal(saved.items.length, 20); assert.equal(saved.items[0].name, '🥬'.repeat(50));
  assert.equal(saved.items[0].quantity, '0.5'); assert.equal(saved.items[0].totalCostMinor, 6050);
  for (const [key, value] of h.values) {
    assert.equal(value.includes('never-store'), false);
    if (/\.\d+$/.test(key)) assert.ok(Buffer.byteLength(value, 'utf8') <= 1600);
  }
});
test('failed scratch-bank writes preserve the previously committed snapshot', async () => {
  const h = harness(), disk = createPantryDiskCache(h.storage, () => at);
  await disk.save(owner, { savedAt: at, items: [item()] }); h.fail();
  await assert.rejects(disk.save(owner, { savedAt: at, items: [item(2)] }));
  assert.equal((await disk.load(owner)).items[0].id, id(1));
});
test('corrupt/missing chunks and wrong-account/branch snapshots fail closed and are removed', async () => {
  for (const scope of ['branch-a:user-b', 'branch-b:user-a', owner, 'corrupt-manifest']) {
    const h = harness(), disk = createPantryDiskCache(h.storage, () => at);
    await disk.save(owner, { savedAt: at, items: [item()] });
    if (scope === owner) h.values.delete([...h.values.keys()].find(key => /\.0$/.test(key)));
    if (scope === 'corrupt-manifest') h.values.set('freshtrack.pantry.copy.v1.active', '{');
    assert.equal(await disk.load(scope), null); assert.equal(h.values.has('freshtrack.pantry.copy.v1.active'), false);
  }
});
test('expired snapshots are rejected; invalid entry fields never become a saved copy', async () => {
  const h = harness(); const disk = createPantryDiskCache(h.storage, () => at);
  await disk.save(owner, { savedAt: at, items: [item()] });
  assert.equal(await createPantryDiskCache(h.storage, () => at + 86400001).load(owner), null);
  for (const fields of [{ category: 'Unknown' }, { status: 'CONSUMED' }, { quantity: '0' }, { totalCostMinor: -1 }, { expiresOn: '2026-02-30' }, { id: 'invalid' }]) {
    assert.throws(() => disk.save(owner, { savedAt: at, items: [item(1, fields)] }));
  }
});
test('sign-out cancels an in-progress save and wipes both banks without touching auth storage', async () => {
  const h = harness(); let release, entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const storage = { ...h.storage, set: async (key, value) => {
    if (/\.0$/.test(key)) { entered(); await new Promise(resolve => { release = resolve; }); }
    await h.storage.set(key, value);
  } };
  const disk = createPantryDiskCache(storage, () => at);
  h.values.set('freshtrack.neon.cookie.v1.keep', 'provider-fixture');
  const saving = disk.save(owner, { savedAt: at, items: [item()] });
  await waiting; const clearing = disk.clear(); release();
  assert.equal(await saving, false); await clearing;
  assert.equal(await disk.load(owner), null); assert.equal(h.values.get('freshtrack.neon.cookie.v1.keep'), 'provider-fixture');
  assert.equal([...h.values.keys()].some(key => key.startsWith('freshtrack.pantry.')), false);
});
test('an authoritative empty copy replaces old groceries across restart', async () => {
  const h = harness(), disk = createPantryDiskCache(h.storage, () => at);
  await disk.save(owner, { savedAt: at, items: [item()] });
  await disk.save(owner, { savedAt: at, items: [] });
  assert.deepEqual((await createPantryDiskCache(h.storage, () => at).load(owner)).items, []);
});

import { bindPantryCacheCleanup } from '../lib/pantryDiskCache.ts';
import { createAuthSession } from '../lib/authSession.ts';
test('verified startup preserves a saved copy, successful sign-out clears it, and direct account changes clear it', async () => {
  let current = { id: 'a', name: 'Fixture', email: 'a@example.test' }, clears = 0;
  const session = createAuthSession({ getSession: async () => current, signOut: async () => { current = null; } }, true);
  const stop = bindPantryCacheCleanup(session, async () => { clears++; });
  await session.refresh(); assert.equal(clears, 0);
  current = { id: 'b', name: 'Fixture', email: 'b@example.test' };
  await session.authenticate(async () => current); assert.equal(clears, 1);
  await session.signOut(); assert.equal(clears, 2); stop();
});
test('failed offline session verification blocks access without deleting a copy needed after verification recovery', async () => {
  let offline = false, clears = 0;
  const user = { id: 'a', name: 'Fixture', email: 'a@example.test' };
  const session = createAuthSession({ getSession: async () => { if (offline) throw Error('network'); return user; }, signOut: async () => {} }, true);
  bindPantryCacheCleanup(session, async () => { clears++; });
  await session.refresh(); offline = true;
  await assert.rejects(session.refresh()); assert.equal(session.getSnapshot().user, null); assert.equal(session.getSnapshot().status, 'error'); assert.equal(clears, 0);
  offline = false; await session.refresh(); assert.equal(session.getSnapshot().user.id, 'a'); assert.equal(clears, 0);
});
