import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { bindExpiryCleanup, planExpiryReminders, createExpiryScheduler, reminderPrefix } from '../lib/expiryReminders.ts';
process.env.TZ = 'Asia/Kolkata';
const scope = 'branch:user-a';
const at = Date.parse('2026-10-12T10:00:00+05:30');
const item = (n = 1, expiresOn = '2026-10-15') => ({ id: `11111111-1111-1111-1111-${String(n).padStart(12, '0')}`, expiresOn, status: 'ACTIVE' });
function harness() {
  const rows = new Map(); let current = scope, scheduled = 0, cancelled = 0;
  const io = { list: async () => [...rows.values()], cancel: async id => { cancelled++; rows.delete(id); },
    schedule: async reminder => { scheduled++; rows.set(reminder.identifier, { ...reminder }); return reminder.identifier; } };
  const scheduler = createExpiryScheduler(io, () => current, () => at);
  return { io, rows, scheduler, current: value => { current = value; }, get scheduled() { return scheduled; }, get cancelled() { return cancelled; } };
}
test('three milestone dates use device-local time and stable identifiers', () => {
  const planned = planExpiryReminders(scope, [item()], '17:00', at);
  assert.deepEqual(planned.reminders.map(row => new Date(row.at).toISOString()), ['2026-10-12T11:30:00.000Z', '2026-10-14T11:30:00.000Z', '2026-10-15T11:30:00.000Z']);
  assert.deepEqual(planned.reminders.map(row => row.daysBefore), [3, 1, 0]);
  assert.equal(new Set(planned.reminders.map(row => row.identifier)).size, 3);
});
test('past milestones and resolved items are skipped, including the exact current instant', () => {
  assert.equal(planExpiryReminders(scope, [item()], '17:00', Date.parse('2026-10-12T17:00:00+05:30')).reminders.length, 2);
  assert.equal(planExpiryReminders(scope, [item(1, '2026-10-12')], '17:00', at).reminders.length, 1);
  assert.equal(planExpiryReminders(scope, [item(1, '2026-10-11'), { ...item(2), status: 'CONSUMED' }], '17:00', at).reminders.length, 0);
});
test('calendar validation precedes native changes and nearest pending alerts are bounded deterministically', () => {
  for (const [items, hour] of [[[item(1, '2026-02-30')], '17:00'], [[item()], '25:99'], [[item(), item()], '17:00']]) {
    assert.throws(() => planExpiryReminders(scope, items, hour, at));
  }
  const result = planExpiryReminders(scope, Array.from({ length: 30 }, (_, n) => item(n)), '17:00', at);
  assert.equal(result.reminders.length, 60); assert.equal(result.omitted, 30);
  assert.ok(result.reminders.every((row, index, all) => index === 0 || all[index - 1].at <= row.at));
});
test('DST gap uses JavaScript device-local normalization without subtracting fixed 24-hour durations', () => {
  const url = new URL('../lib/expiryReminders.ts', import.meta.url).href;
  const source = `import {planExpiryReminders} from ${JSON.stringify(url)}; console.info(JSON.stringify(planExpiryReminders('scope', [${JSON.stringify(item(1, '2026-03-08'))}], '02:30', Date.parse('2026-03-01T00:00:00Z')).reminders.map(row=>new Date(row.at).toISOString())));`;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', source], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), ['2026-03-05T07:30:00.000Z', '2026-03-07T07:30:00.000Z', '2026-03-08T07:30:00.000Z']);
});
test('native ledger reconciles across restart without duplicates and preserves unrelated notifications', async () => {
  const h = harness(); h.rows.set('other-project', { identifier: 'other-project' });
  await h.scheduler.sync(scope, [item()], '17:00', true);
  assert.equal(h.scheduled, 3); assert.equal(h.scheduler.getSnapshot().count, 3);
  const restarted = createExpiryScheduler(h.io, () => scope, () => at);
  await restarted.sync(scope, [item()], '17:00', true); assert.equal(h.scheduled, 3); assert.equal(h.cancelled, 0);
  assert.ok(h.rows.has('other-project'));
});
test('time/date changes replace old alerts and turning Off removes only FreshTrack alarms', async () => {
  const h = harness(); h.rows.set('other-project', { identifier: 'other-project' });
  await h.scheduler.sync(scope, [item()], '17:00', true);
  await h.scheduler.sync(scope, [item(1, '2026-10-16')], '18:30', true);
  assert.equal(h.cancelled, 3); assert.equal(h.scheduler.getSnapshot().count, 3);
  await h.scheduler.sync(scope, [], '18:30', false);
  assert.equal(h.scheduler.getSnapshot().count, 0); assert.deepEqual([...h.rows.keys()], ['other-project']);
});
test('sign-out during a pending native schedule cancels its returned identifier and queued cleanup wins', async () => {
  const h = harness(); let entered, release;
  const waiting = new Promise(resolve => { entered = resolve; }); const schedule = h.io.schedule;
  h.io.schedule = async row => { entered(); await new Promise(resolve => { release = resolve; }); return schedule(row); };
  const syncing = h.scheduler.sync(scope, [item()], '17:00', true); await waiting;
  h.current(null); const clearing = h.scheduler.cancel(); release(); await syncing; await clearing;
  assert.equal(h.rows.size, 0); assert.equal(h.scheduler.getSnapshot().busy, false);
});
test('stale sync preparation cannot re-enable alarms after preferences or Pantry changes', async () => {
  const h = harness(); const version = h.scheduler.generation(); await h.scheduler.cancel();
  await h.scheduler.sync(scope, [item()], '17:00', true, version);
  assert.equal(h.rows.size, 0); assert.match(h.scheduler.getSnapshot().message, /changed/);
});
test('partial native scheduling failure reports uncertainty and a retry completes without duplicates', async () => {
  const h = harness(); let failed = false; const schedule = h.io.schedule;
  h.io.schedule = async row => { if (h.scheduled === 1 && !failed) { failed = true; throw Error('private-native-error'); } return schedule(row); };
  await h.scheduler.sync(scope, [item()], '17:00', true);
  assert.match(h.scheduler.getSnapshot().message, /Some alerts/); assert.equal(h.rows.size, 1);
  await h.scheduler.sync(scope, [item()], '17:00', true); assert.equal(h.rows.size, 3); assert.equal(h.scheduled, 3);
});
test('account isolation and item cancellation remove stale scopes without cancelling unrelated entries', async () => {
  const h = harness(); await h.scheduler.sync(scope, [item(), item(2)], '17:00', true);
  await h.scheduler.cancel(null, [item().id]); assert.equal(h.rows.size, 3);
  h.current('branch:user-b'); await h.scheduler.cancel('branch:user-b'); assert.equal(h.rows.size, 0);
});
test('shared OS capacity defers excess owned reminders rather than altering other projects', async () => {
  const h = harness(); for (let n = 0; n < 59; n++) h.rows.set(`other-${n}`, { identifier: `other-${n}` });
  await h.scheduler.sync(scope, [item()], '17:00', true);
  assert.equal(h.scheduled, 1); assert.match(h.scheduler.getSnapshot().message, /2 later alerts deferred/);
  assert.equal([...h.rows.keys()].filter(id => !id.startsWith(reminderPrefix)).length, 59);
});
test('auth cleanup preserves generic alerts on offline failure and cancels them after successful sign-out', async () => {
  const h = harness(); await h.scheduler.sync(scope, [item()], '17:00', true);
  let value = { checking: true, status: 'authenticated', user: { id: 'user-a' } }, listener;
  const session = { getSnapshot: () => value, subscribe: callback => { listener = callback; return () => { listener = null; }; } };
  const stop = bindExpiryCleanup(session, h.scheduler, id => `branch:${id}`);
  value = { checking: false, status: 'error', user: null }; h.current(null); listener();
  await h.scheduler.inspect(scope); assert.equal(h.rows.size, 3);
  value = { checking: false, status: 'anonymous', user: null }; listener();
  await h.scheduler.inspect(scope); assert.equal(h.rows.size, 0); stop(); assert.equal(listener, null);
});
test('legacy alerts are upgraded to action-bearing metadata without growing the pending queue', async () => {
  const h = harness(); await h.scheduler.sync(scope, [item()], '17:00', true);
  for (const row of h.rows.values()) delete row.actionVersion;
  await h.scheduler.sync(scope, [item()], '17:00', true);
  assert.equal(h.rows.size, 3); assert.equal(h.cancelled, 3);
  assert.ok([...h.rows.values()].every(row => row.actionVersion === 1));
  await h.scheduler.sync(scope, [item()], '17:00', true); assert.equal(h.cancelled, 3);
});
