import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverdueReview, overdueItems } from '../lib/overdueReview.ts';
import { bindAutomaticReminderSession } from '../lib/automaticReminders.ts';
const row = (n = 1, daysLeft = -1) => {
  const date = new Date('2026-10-14T00:00:00Z'); date.setUTCDate(date.getUTCDate() + daysLeft);
  return { id: `11111111-1111-1111-1111-${String(n).padStart(12, '0')}`, name: `Overdue fixture ${n}`, status: 'ACTIVE', daysLeft,
    expiresOn: date.toISOString().slice(0, 10), updatedAt: '2026-10-14T08:00:00.000Z' };
};
test('only passed calendar dates are overdue; today, future and resolved records are excluded without mutations', () => {
  const rows = [row(1, 0), row(2, 1), row(3, -1), row(4, -5), { ...row(5, -1), status: 'CONSUMED' }, { ...row(6, -1), status: 'WASTED' }];
  const before = structuredClone(rows), result = overdueItems(rows);
  assert.equal(result.householdDay, '2026-10-14'); assert.deepEqual(result.items.map(item => item.id), [row(4).id, row(3).id]);
  assert.deepEqual(rows, before); assert.ok(result.items.every(item => item.status === 'ACTIVE'));
});
test('expiry uses the server household day rather than the phone timezone or clock', async () => {
  const review = createOverdueReview({ active: () => true, read: async () => [row()] }, () => Date.parse('2030-01-01T00:00:00Z'));
  await review.request(); assert.equal(review.getSnapshot().householdDay, '2026-10-14'); assert.equal(review.getSnapshot().items.length, 1);
});
test('empty active Pantry is a successful zero rather than an unavailable count', async () => {
  const review = createOverdueReview({ active: () => true, read: async () => [] }); await review.request();
  assert.equal(review.getSnapshot().status, 'ready'); assert.equal(review.getSnapshot().items.length, 0);
});
test('malformed, duplicate and midnight-mixed snapshots fail closed instead of publishing a false total', () => {
  for (const rows of [[row(), row()], [{ ...row(), expiresOn: '2026-02-30' }], [{ ...row(), daysLeft: NaN }],
    [row(), { ...row(2), daysLeft: -2 }], [{ ...row(), id: 'invalid' }], [{ ...row(), status: 'UNKNOWN' }]]) assert.throws(() => overdueItems(rows));
});
test('burst requests coalesce and a newer mutation supersedes an old live read', async () => {
  let reads = 0, release, entered; const first = new Promise(resolve => { entered = resolve; });
  const review = createOverdueReview({ active: () => true, read: async () => {
    reads++; if (reads === 1) { entered(); await new Promise(resolve => { release = resolve; }); return [row()]; } return [];
  } });
  const initial = review.request(); await first;
  for (let n = 0; n < 10; n++) void review.request(); release(); await initial;
  assert.equal(reads, 2); assert.equal(review.getSnapshot().status, 'ready'); assert.equal(review.getSnapshot().items.length, 0);
});
test('session loss and diagnostic ineligibility clear previous counts and prevent live reads', async () => {
  let active = true, reads = 0; const review = createOverdueReview({ active: () => active, read: async () => { reads++; return [row()]; } });
  await review.request(); active = false; review.invalidate(); await review.request();
  assert.equal(reads, 1); assert.equal(review.getSnapshot().status, 'idle'); assert.equal(review.getSnapshot().items.length, 0);
});
test('late data after teardown cannot restore a private overdue snapshot', async () => {
  let active = true, entered, release; const began = new Promise(resolve => { entered = resolve; });
  const review = createOverdueReview({ active: () => active, read: async () => { entered(); await new Promise(resolve => { release = resolve; }); return [row()]; } });
  const work = review.request(); await began; active = false; review.invalidate(); release(); await work;
  assert.equal(review.getSnapshot().status, 'idle'); assert.equal(review.getSnapshot().items.length, 0);
});
test('availability/limit failure clears fresh counts and can recover without assuming outcomes', async () => {
  let failed = false; const review = createOverdueReview({ active: () => true, read: async () => { if (failed) throw Error('PANTRY_LIMIT'); return [row()]; } });
  await review.request(); failed = true; await review.request(); assert.equal(review.getSnapshot().status, 'error'); assert.equal(review.getSnapshot().items.length, 0);
  failed = false; await review.request(); assert.equal(review.getSnapshot().status, 'ready'); assert.equal(review.getSnapshot().items[0].status, 'ACTIVE');
});
test('verified startup/resume discovers overdue groceries independent of reminder preferences', async () => {
  let state = { checking: false, status: 'authenticated', user: { id: 'account-a' } }, listener, reads = 0;
  const session = { getSnapshot: () => state, subscribe: callback => { listener = callback; return () => { listener = null; }; } };
  const review = createOverdueReview({ active: () => !state.checking && state.user?.id === 'account-a', read: async () => { reads++; return [row()]; } });
  const stop = bindAutomaticReminderSession(session, review, id => id === 'account-a');
  await review.request(); assert.equal(reads, 1);
  state = { ...state, checking: true }; listener(); assert.equal(review.getSnapshot().status, 'idle');
  state = { ...state, checking: false }; listener(); await review.request(); assert.equal(reads, 2);
  state = { checking: false, status: 'authenticated', user: { id: 'account-b' } }; listener(); assert.equal(review.getSnapshot().status, 'idle');
  stop(); assert.equal(listener, null);
});
