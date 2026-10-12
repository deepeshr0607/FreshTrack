import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReminderPreferences, readReminderChoice } from '../lib/reminderPreferences.ts';
const scope = 'development:user-a';
function harness() {
  let raw = null, active = true, permission = { allowed: false, canAskAgain: true, label: 'Not allowed yet' };
  let requests = 0, writes = 0, fail = false;
  const io = { read: async () => raw, permission: async () => permission,
    request: async () => { requests++; permission = { allowed: true, canAskAgain: true, label: 'Allowed' }; return permission; },
    write: async value => { if (fail) throw Error('private-storage-error'); writes++; raw = value; } };
  const model = createReminderPreferences(scope, io, () => active);
  return { model, io, get requests() { return requests; }, get writes() { return writes; }, get raw() { return raw; },
    permission: value => { permission = value; }, active: value => { active = value; }, fail: () => { fail = true; } };
}
test('opening Settings checks status without prompting or enabling, then explicit opt-in persists across restart', async () => {
  const h = harness(); await h.model.refresh();
  assert.equal(h.requests, 0); assert.equal(h.writes, 0); assert.equal(h.model.getSnapshot().enabled, false);
  await h.model.enable(); assert.equal(h.requests, 1); assert.equal(h.model.getSnapshot().enabled, true);
  const restarted = createReminderPreferences(scope, h.io, () => true); await restarted.refresh();
  assert.equal(restarted.getSnapshot().enabled, true); assert.equal(h.requests, 1);
});
test('already-authorized opt-in does not request permission; opt-out persists without revoking OS permission', async () => {
  const h = harness(); h.permission({ allowed: true, canAskAgain: false, label: 'Allowed quietly' });
  await h.model.refresh(); await h.model.enable(); assert.equal(h.requests, 0);
  await h.model.disable(); await h.model.refresh();
  assert.equal(h.model.getSnapshot().enabled, false); assert.equal(h.model.getSnapshot().permission.allowed, true);
});
test('denied permission cannot enable reminders, blocked permission does not repeatedly prompt', async () => {
  const h = harness(); h.io.request = async () => ({ allowed: false, canAskAgain: false, label: 'Blocked' });
  await h.model.refresh(); await h.model.enable(); assert.equal(h.writes, 0);
  assert.match(h.model.getSnapshot().message, /device settings/);
  h.permission({ allowed: false, canAskAgain: false, label: 'Blocked' });
  h.io.request = async () => { throw Error('must-not-prompt'); };
  await h.model.enable(); assert.equal(h.writes, 0); assert.match(h.model.getSnapshot().message, /device settings/);
});
test('invalid or wrong-account preferences default off, including malformed hour values', () => {
  for (const raw of ['{', null, JSON.stringify({ version: 1, scope: 'other', enabled: true, hour: '18:30' }),
    JSON.stringify({ version: 1, scope, enabled: true, hour: ['18:30'] })]) {
    assert.deepEqual(readReminderChoice(raw, scope), { enabled: false, hour: '17:00' });
  }
});
test('time validation and storage errors preserve the last acknowledged choice and hide private errors', async () => {
  const h = harness(); await h.model.refresh();
  await h.model.saveHour('25:99'); assert.equal(h.writes, 0); assert.match(h.model.getSnapshot().message, /valid/);
  await h.model.saveHour('18:30'); await h.model.refresh(); assert.equal(h.model.getSnapshot().hour, '18:30');
  h.fail(); await h.model.saveHour('19:30'); assert.equal(h.model.getSnapshot().hour, '18:30');
  assert.equal(h.model.getSnapshot().message.includes('private-storage-error'), false);
});
test('session changes while permission is pending cannot persist opt-in; busy state recovers', async () => {
  const h = harness(); let release; h.io.request = () => new Promise(resolve => { release = resolve; });
  await h.model.refresh(); const enabling = h.model.enable();
  await new Promise(resolve => setImmediate(resolve)); h.active(false);
  release({ allowed: true, canAskAgain: true, label: 'Allowed' }); await enabling;
  assert.equal(h.writes, 0); assert.equal(h.model.getSnapshot().busy, false);
  h.active(true); await h.model.refresh(); assert.equal(h.model.getSnapshot().ready, true);
});
test('repeated enable taps while prompt is pending make only one request/write', async () => {
  const h = harness(); let release, count = 0;
  h.io.request = () => { count++; return new Promise(resolve => { release = resolve; }); };
  await h.model.refresh(); const enabling = h.model.enable();
  await new Promise(resolve => setImmediate(resolve)); await h.model.enable();
  release({ allowed: true, canAskAgain: true, label: 'Allowed' }); await enabling;
  assert.equal(count, 1); assert.equal(h.writes, 1);
});
test('permission revocation on resume leaves the preference separate and supports explicit disable', async () => {
  const h = harness(); await h.model.refresh(); await h.model.enable();
  h.permission({ allowed: false, canAskAgain: false, label: 'Blocked' }); await h.model.refresh();
  assert.equal(h.model.getSnapshot().enabled, true); assert.equal(h.model.getSnapshot().permission.allowed, false);
  await h.model.disable(); assert.equal(h.model.getSnapshot().enabled, false);
});
test('initial status/storage failure stays disabled and recovers through a read-only retry', async () => {
  const h = harness(); const read = h.io.read;
  h.io.read = async () => { throw Error('private-storage-error'); };
  await h.model.refresh(); assert.equal(h.model.getSnapshot().ready, false); assert.equal(h.model.getSnapshot().busy, false);
  await h.model.enable(); assert.equal(h.writes, 0); assert.equal(h.requests, 0);
  h.io.read = read; await h.model.refresh(); assert.equal(h.model.getSnapshot().ready, true);
  assert.equal(h.writes, 0); assert.equal(h.requests, 0);
});
