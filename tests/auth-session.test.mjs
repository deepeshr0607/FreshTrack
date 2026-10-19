import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSession, canAccessKitchen } from '../lib/authSession.ts';
const user = { id: 'fixture-user', email: 'fixture@example.test', name: 'Fixture' };
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('cold startup stays unavailable until provider identity verifies; null session locks kitchen', async () => {
  const pending = deferred();
  const session = createAuthSession({ getSession: () => pending.promise, signOut: async () => {} }, true);
  assert.equal(session.getSnapshot().checking, true);
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
  const restoring = session.refresh();
  pending.resolve(user);
  assert.deepEqual(await restoring, user);
  assert.equal(canAccessKitchen(session.getSnapshot()), true);
  const expired = createAuthSession({ getSession: async () => null, signOut: async () => {} }, false);
  await expired.refresh();
  assert.equal(canAccessKitchen(expired.getSnapshot()), false);
});
test('accepted login must independently verify the same provider identity', async () => {
  for (const restored of [null, { ...user, id: 'other-user' }, { ...user, email: 'other@example.test' }]) {
    const session = createAuthSession({ getSession: async () => restored, signOut: async () => {} }, false);
    await assert.rejects(session.authenticate(async () => user));
    assert.equal(canAccessKitchen(session.getSnapshot()), false);
    assert.equal(session.getSnapshot().user, null);
  }
  const session = createAuthSession({ getSession: async () => user, signOut: async () => {} }, false);
  assert.deepEqual(await session.authenticate(async () => user), user);
  assert.equal(canAccessKitchen(session.getSnapshot()), true);
});
test('verification without auto-sign-in finishes anonymously without restoring an older account', async () => {
  let reads = 0;
  const session = createAuthSession({ getSession: async () => { reads++; return user; }, signOut: async () => {} }, false);
  assert.equal(await session.authenticate(async () => null), null);
  assert.equal(reads, 0);
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
});
test('resume checks preserve current route behind loading; expiry or network failure removes access; retry recovers', async () => {
  let response = user;
  const session = createAuthSession({ getSession: async () => { if (response instanceof Error) throw response; return response; }, signOut: async () => {} }, false);
  await session.refresh();
  const refreshing = session.refresh();
  assert.equal(session.getSnapshot().checking, true);
  assert.equal(canAccessKitchen(session.getSnapshot()), true);
  await refreshing;
  response = new Error('fixture-provider-sensitive-text');
  await assert.rejects(session.refresh());
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
  assert.equal(session.getSnapshot().error.includes('fixture-provider'), false);
  response = user;
  await session.refresh();
  assert.equal(canAccessKitchen(session.getSnapshot()), true);
  response = null;
  await session.refresh();
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
});
test('a late restoration cannot resurrect a session after queued sign-out', async () => {
  const pending = deferred();
  let revoked = false;
  const session = createAuthSession({ getSession: () => pending.promise, signOut: async () => { revoked = true; } }, false);
  const restoring = session.refresh();
  const exiting = session.signOut();
  pending.resolve(user);
  await restoring; await exiting;
  assert.equal(revoked, true);
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
  assert.equal(session.getSnapshot().user, null);
});
test('sign-out failure preserves verified identity for a visible retry; success locks routes', async () => {
  let fail = true;
  const session = createAuthSession({ getSession: async () => user, signOut: async () => { if (fail) throw new Error('offline'); } }, false);
  await session.refresh();
  await assert.rejects(session.signOut());
  assert.deepEqual(session.getSnapshot().user, user);
  assert.equal(session.getSnapshot().checking, false);
  fail = false;
  await session.signOut();
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
});
test('demo is explicit, cannot be activated during restoration or production native, and never has real identity', async () => {
  const session = createAuthSession({ getSession: async () => null, signOut: async () => {} }, true);
  assert.equal(session.enterDemo(), false);
  await session.refresh();
  assert.equal(session.enterDemo(), true);
  assert.equal(session.getSnapshot().user, null);
  assert.equal(canAccessKitchen(session.getSnapshot()), true);
  await session.refresh();
  assert.equal(session.getSnapshot().demo, true);
  session.exitDemo();
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
  const production = createAuthSession(null, false);
  assert.equal(production.enterDemo(), false);
  assert.equal(canAccessKitchen(production.getSnapshot()), false);
});

test('account deletion locks kitchen interactions and failed completion preserves identity for retry', async () => {
  const session = createAuthSession({ getSession: async () => user, signOut: async () => {} }, false);
  await session.refresh();
  const pending = deferred(); const operation = session.deleteAccount(user.id, () => pending.promise);
  assert.equal(session.getSnapshot().checking, true);
  await assert.rejects(session.deleteAccount(user.id, async () => {}));
  pending.reject(Error('private-deletion-detail')); await assert.rejects(operation);
  assert.equal(session.getSnapshot().user.id, user.id); assert.equal(session.getSnapshot().checking, false);
  assert.equal(session.getSnapshot().error.includes('private-deletion'), false);
  await session.deleteAccount(user.id, async () => {});
  assert.equal(canAccessKitchen(session.getSnapshot()), false);
});

test('stale deletion confirmation cannot act on another signed-in subject', async () => {
  const session = createAuthSession({ getSession: async () => user, signOut: async () => {} }, false);
  await session.refresh(); let calls = 0;
  await assert.rejects(session.deleteAccount('previous-account', async () => { calls++; }));
  assert.equal(calls, 0); assert.equal(session.getSnapshot().user.id, user.id);
});
