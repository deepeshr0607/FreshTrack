import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindAutomaticReminderSession, createAutomaticReminders } from '../lib/automaticReminders.ts';
import { createExpiryScheduler } from '../lib/expiryReminders.ts';
process.env.TZ = 'Asia/Kolkata';
const scope = 'branch:user-a', at = Date.parse('2026-10-12T10:00:00+05:30');
const item = (expiresOn = '2026-10-15') => ({ id: '11111111-1111-1111-1111-111111111111', expiresOn, status: 'ACTIVE' });
function harness() {
  const rows = new Map(); let active = true, choice = { enabled: true, hour: '17:00' }, source = [item()], reads = 0, commits = 0;
  const scheduler = createExpiryScheduler({ list: async () => [...rows.values()], cancel: async id => { rows.delete(id); },
    schedule: async reminder => { rows.set(reminder.identifier, { ...reminder }); return reminder.identifier; } }, () => active ? scope : null, () => at);
  const io = { active: () => active, readChoice: async () => ({ ...choice }), readItems: async () => { reads++; return source.map(row => ({ ...row })); },
    invalidate: scheduler.invalidate, generation: scheduler.generation,
    commit: async (items, current, generation) => { commits++; await scheduler.sync(scope, items, current.hour, current.enabled, generation); },
    notice: message => scheduler.notice(scope, message) };
  const automatic = createAutomaticReminders(io);
  return { rows, scheduler, automatic, io, active: value => { active = value; }, choice: value => { choice = value; }, source: value => { source = value; },
    get reads() { return reads; }, get commits() { return commits; } };
}
test('bursts coalesce into one live read and one native reconciliation', async () => {
  const h = harness(); const work = Array.from({ length: 20 }, () => h.automatic.request()); await Promise.all(work);
  assert.equal(h.reads, 1); assert.equal(h.commits, 1); assert.equal(h.rows.size, 3);
});
test('a change while the API read is pending discards stale data and commits the latest inventory', async () => {
  const h = harness(); let release, started; const entered = new Promise(resolve => { started = resolve; }); let reads = 0;
  h.io.readItems = async () => { if (++reads === 1) { started(); return new Promise(resolve => { release = resolve; }); } return [item('2026-10-20')]; };
  const first = h.automatic.request(); await entered; const latest = h.automatic.request(); release([item()]); await Promise.all([first, latest]);
  assert.equal(h.commits, 1); assert.equal(h.rows.size, 3);
  assert.ok([...h.rows.values()].every(row => new Date(row.at).getDate() >= 17));
});
test('turning Off needs no Pantry API and cancels only owned alarms', async () => {
  const h = harness(); await h.automatic.flush(); h.rows.set('other-project', { identifier: 'other-project' });
  h.choice({ enabled: false, hour: '17:00' }); const previousReads = h.reads; await h.automatic.request();
  assert.equal(h.reads, previousReads); assert.deepEqual([...h.rows.keys()], ['other-project']);
});
test('a preference change during a live read is rechecked before old data can schedule alerts', async () => {
  const h = harness(); h.io.readItems = async () => { h.choice({ enabled: false, hour: '18:30' }); return [item()]; };
  await h.automatic.request(); assert.equal(h.commits, 1); assert.equal(h.rows.size, 0);
  assert.match(h.scheduler.getSnapshot().message, /Off/);
});
test('auth loss or provider teardown during a pending read cannot commit', async () => {
  const h = harness(); let release, started; const entered = new Promise(resolve => { started = resolve; });
  h.io.readItems = async () => { started(); return new Promise(resolve => { release = resolve; }); };
  const work = h.automatic.request(); await entered; h.active(false); h.automatic.invalidate(); release([item()]); await work;
  assert.equal(h.commits, 0); assert.equal(h.rows.size, 0);
});
test('failed automatic reads preserve an existing queue and explicit retry recovers without duplicates', async () => {
  const h = harness(); await h.automatic.flush(); const original = JSON.stringify([...h.rows.values()]); const read = h.io.readItems;
  h.io.readItems = async () => { throw Error('private-api-error'); }; await h.automatic.request();
  assert.equal(JSON.stringify([...h.rows.values()]), original); assert.match(h.scheduler.getSnapshot().message, /Automatic reminder refresh failed/);
  h.io.readItems = read; await h.automatic.flush(); assert.equal(h.rows.size, 3);
});
test('add/edit/outcome/restore signals reconcile active server data with stable native identifiers', async () => {
  const h = harness(); h.source([]); await h.automatic.flush(); assert.equal(h.rows.size, 0);
  h.source([item()]); await h.automatic.request(); const identifiers = [...h.rows.keys()]; assert.equal(h.rows.size, 3);
  h.source([item('2026-10-20')]); await h.automatic.request(); assert.deepEqual([...h.rows.keys()], identifiers);
  h.source([]); await h.automatic.request(); assert.equal(h.rows.size, 0);
  h.source([item('2026-10-20')]); await h.automatic.request(); assert.equal(h.rows.size, 3);
  h.choice({ enabled: true, hour: '18:30' }); await h.automatic.request();
  assert.ok([...h.rows.values()].every(row => new Date(row.at).getHours() === 18 && new Date(row.at).getMinutes() === 30));
});
test('session publications trigger resume even without intermediate React renders; wrong identity and diagnostic pauses stay ineligible', async () => {
  const h = harness(); let snapshot = { checking: true, user: { id: 'user-a' } }, listener, cached = false;
  const session = { getSnapshot: () => snapshot, subscribe: fn => { listener = fn; return () => { listener = null; }; } };
  const stop = bindAutomaticReminderSession(session, h.automatic, id => id === 'user-a' && !cached);
  snapshot = { checking: false, user: { id: 'user-a' } }; listener(); await h.automatic.flush(); assert.equal(h.rows.size, 3);
  const reads = h.reads; snapshot = { checking: true, user: { id: 'user-a' } }; listener(); snapshot = { checking: false, user: { id: 'user-a' } }; listener();
  await h.automatic.flush(); assert.equal(h.reads, reads + 1);
  cached = true; listener(); snapshot = { checking: false, user: { id: 'other' } }; listener();
  await new Promise(resolve => setImmediate(resolve)); assert.equal(h.reads, reads + 1); stop(); assert.equal(listener, null);
});
