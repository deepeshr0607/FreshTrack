import { test } from 'node:test';
import assert from 'node:assert/strict';
import { developmentToolsEnabled } from '../lib/developmentTools.ts';
import { canAccessKitchen, createAuthSession } from '../lib/authSession.ts';
import { createNotificationOutbox } from '../lib/notificationOutbox.ts';

test('demo kitchen requires an exact explicit opt-in in a development bundle', () => {
  for (const development of [true, false]) {
    for (const flag of [undefined, '', 'false', 'TRUE', '1', 'true']) {
      const session = createAuthSession(null, developmentToolsEnabled(development, flag));
      const allowed = development && flag === 'true';
      assert.equal(session.enterDemo(), allowed);
      assert.equal(canAccessKitchen(session.getSnapshot()), allowed);
    }
  }
});

test('turning diagnostics off recovers a saved confirmed notification without duplicate sends', async () => {
  let raw = null;
  const sent = [];
  const scope = 'account-a';
  const io = { read: async () => raw, write: async value => { raw = value; }, active: () => true,
    send: async value => { sent.push(value); }, acknowledged: async () => {} };
  const testQueue = createNotificationOutbox(scope, io, developmentToolsEnabled(true, 'true'));
  const request = { id: '11111111-1111-1111-1111-111111111111', action: 'waste',
    key: 'confirmed-request-1', expectedUpdatedAt: '2026-10-19T08:00:00.000Z' };
  await testQueue.pause(true);
  await testQueue.confirm(request);
  await testQueue.flush();
  assert.equal(sent.length, 0);
  const normalQueue = createNotificationOutbox(scope, io, developmentToolsEnabled(true, undefined));
  await Promise.all([normalQueue.flush(), normalQueue.flush()]);
  await normalQueue.flush();
  assert.equal(normalQueue.getSnapshot().paused, false);
  assert.equal(normalQueue.getSnapshot().entries.length, 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].key, request.key);
  assert.equal(sent[0].action, 'waste');
});
