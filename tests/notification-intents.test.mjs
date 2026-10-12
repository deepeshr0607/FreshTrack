import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationIntentInbox, parseNotificationIntent, expiryActionCategory, consumeNotificationAction, wasteNotificationAction, defaultNotificationAction } from '../lib/notificationIntents.ts';
const now = Date.parse('2026-10-13T12:00:00Z'), scope = 'branch:user-a', id = '11111111-1111-1111-1111-111111111111';
const response = (action = consumeNotificationAction) => ({ actionIdentifier: action, notification: { date: now,
  request: { identifier: `freshtrack.expiry.v1.${id}.1`, content: { categoryIdentifier: expiryActionCategory,
    data: { itemId: id, scope, daysBefore: 1, at: now } } } } });
test('Consumed/Wasted responses become scoped confirmation intents; body taps are view-only', () => {
  assert.equal(parseNotificationIntent(response(), now).action, 'consume');
  assert.equal(parseNotificationIntent(response(wasteNotificationAction), now).action, 'waste');
  const legacy = response(defaultNotificationAction); delete legacy.notification.request.content.categoryIdentifier;
  assert.equal(parseNotificationIntent(legacy, now).action, 'view');
});
test('unowned, malformed, mismatched and unknown action responses never become a route', () => {
  const cases = [null, {}, response('UNKNOWN')];
  for (const change of [r => { r.notification.request.identifier = 'https://evil.example'; },
    r => { r.notification.request.content.data.itemId = 'different-item'; },
    r => { r.notification.request.content.data.daysBefore = 0; },
    r => { r.notification.request.content.data.at = -1; },
    r => { r.notification.request.content.data.scope = 'x'.repeat(513); },
    r => { r.notification.request.content.categoryIdentifier = 'OTHER'; },
    r => { r.notification.date = now + 60001; }, r => { r.notification.date = now - 31 * 86400000; }]) {
    const r = response(); change(r); cases.push(r);
  }
  cases.forEach(r => assert.equal(parseNotificationIntent(r, now), null));
});
test('duplicate listener/cold-start responses navigate once, with no mutation callback', () => {
  const inbox = createNotificationIntentInbox(() => now);
  assert.equal(inbox.receive(response()), true); assert.equal(inbox.receive(response()), false);
  assert.equal(inbox.take(scope, false, false).itemId, id); assert.equal(inbox.take(scope, false, false), null);
});
test('checking and signed-out states retain only an in-memory navigation intent until matching login', () => {
  const inbox = createNotificationIntentInbox(() => now); inbox.receive(response());
  assert.equal(inbox.take(scope, true, false), null); assert.equal(inbox.take(null, false, false), null);
  assert.equal(inbox.take(scope, false, false).action, 'consume');
});
test('wrong account/branch, Demo and stale pending intents are discarded', () => {
  for (const other of ['branch:user-b', 'another-branch:user-a']) {
    const inbox = createNotificationIntentInbox(() => now); inbox.receive(response());
    assert.equal(inbox.take(other, false, false), null); assert.equal(inbox.take(scope, false, false), null);
  }
  const demo = createNotificationIntentInbox(() => now); demo.receive(response()); assert.equal(demo.take(scope, false, true), null);
  let clock = now; const expired = createNotificationIntentInbox(() => clock); expired.receive(response()); clock += 600001;
  assert.equal(expired.take(scope, false, false), null);
});
test('deduplication includes branch scope and the latest valid tap replaces an earlier pending tap', () => {
  const inbox = createNotificationIntentInbox(() => now); inbox.receive(response());
  const other = response(wasteNotificationAction); inbox.receive(other);
  assert.equal(inbox.take(scope, false, false).action, 'waste');
  const branch = response(); branch.notification.request.content.data.scope = 'branch-two:user-a';
  assert.equal(inbox.receive(branch), true); assert.equal(inbox.take('branch-two:user-a', false, false).action, 'consume');
});
