import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptOcrProbe, ReceiptOcrError } from '../lib/receiptOcrProbe.ts';
import { receiptUnassignedPage } from '../lib/receiptUnassignedPage.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, pairReceiptLines, saveReceiptCandidate } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
const fixture = RECEIPT_LAYOUT_FIXTURES.find(row => row.name === 'Unassigned lines (500)');

test('permission denial retains a previous readable photo and allows photo-library recovery', async () => {
  let denied = false; const disposed = [];
  const store = createReceiptOcrProbe({ choose: async source => { if (source === 'camera' && denied) throw new ReceiptOcrError('PERMISSION'); return `cache:${source}`; },
    recognize: async () => ['Milk'], dispose: uri => disposed.push(uri) }, () => true);
  await store.choose('camera'); await store.read(); denied = true; await store.choose('camera');
  assert.equal(store.getSnapshot().errorCode, 'PERMISSION'); assert.equal(store.getSnapshot().busy, false);
  assert.equal(store.getSnapshot().image, 'cache:camera'); assert.deepEqual(store.getSnapshot().lines, ['Milk']); assert.deepEqual(disposed, []);
  await store.choose('library'); assert.equal(store.getSnapshot().errorCode, null); assert.equal(store.getSnapshot().error, '');
  assert.deepEqual(disposed, ['cache:camera']); await store.read(); assert.deepEqual(store.getSnapshot().lines, ['Milk']);
});
test('image/read failures have distinct safe codes, preserve retry image, and empty/retry/clear recover', async () => {
  let failPick = false, failRead = false, result = ['Milk'];
  const store = createReceiptOcrProbe({ choose: async () => { if (failPick) throw Error('private image content'); return 'cache:receipt'; },
    recognize: async () => { if (failRead) throw Error('private Vision internals'); return result; }, dispose: () => {} }, () => true);
  failPick = true; await store.choose('camera'); assert.equal(store.getSnapshot().errorCode, 'IMAGE');
  assert.doesNotMatch(store.getSnapshot().error, /private/);
  failPick = false; await store.choose('camera'); failRead = true; await store.read();
  assert.equal(store.getSnapshot().errorCode, 'READ'); assert.doesNotMatch(store.getSnapshot().error, /private|Vision/);
  assert.equal(store.getSnapshot().image, 'cache:receipt'); assert.equal(store.getSnapshot().busy, false);
  failRead = false; result = []; await store.read();
  assert.equal(store.getSnapshot().errorCode, null); assert.equal(store.getSnapshot().read, true); assert.deepEqual(store.getSnapshot().lines, []);
  result = ['Bread']; await store.read(); assert.deepEqual(store.getSnapshot().lines, ['Bread']);
  store.clear(); assert.equal(store.getSnapshot().errorCode, null); assert.equal(store.getSnapshot().image, null);
});
test('navigation/account invalidation prevents late permission errors from restoring old state', async () => {
  let reject, active = true;
  const store = createReceiptOcrProbe({ choose: () => new Promise((_, r) => { reject = r; }), recognize: async () => [], dispose: () => {} }, () => active);
  const pending = store.choose('camera'); active = false; store.clear(); reject(new ReceiptOcrError('PERMISSION')); await pending;
  assert.equal(store.getSnapshot().errorCode, null); assert.equal(store.getSnapshot().error, ''); assert.equal(store.getSnapshot().busy, false);
});
test('500 source lines remain reachable exactly once with at most ten mounted cards per page', () => {
  const parsed = parseReceiptCandidates(fixture.lines), rows = suggestReceiptNameOnlyItems(parsed);
  const before = JSON.stringify(parsed); assert.equal(rows.length, 0); assert.equal(parsed.remaining.length, 500);
  const visible = [];
  for (let page = 0; page < 50; page++) {
    const result = receiptUnassignedPage(parsed, rows, page);
    assert.equal(result.pages, 50); assert.equal(result.visible.length, 10); assert.equal(result.page, page);
    visible.push(...result.visible.map(line => line.id));
  }
  assert.deepEqual(visible, parsed.remaining.map(line => line.id)); assert.equal(new Set(visible).size, 500);
  assert.equal(JSON.stringify(parsed), before);
});
test('cross-page matching/cancel/save/removal preserve source IDs, price and exact reviewed payload', () => {
  const parsed = parseReceiptCandidates(fixture.lines), rows = [];
  const first = receiptUnassignedPage(parsed, rows, 0), last = receiptUnassignedPage(parsed, rows, 49);
  const name = first.visible.find(row => row.id === 'line-1'), amount = last.visible.find(row => row.kind === 'amount');
  const proposed = pairReceiptLines(parsed.remaining, name.id, amount.id, rows);
  assert.equal(proposed.draft.price, '40.00');
  // Editor cancellation does not reserve or consume either line, even after page navigation.
  assert.equal(receiptUnassignedPage(parsed, rows, 49).remaining.length, 500);
  const saved = saveReceiptCandidate({ ...proposed, draft: { ...proposed.draft, quantity: '1', unit: 'piece' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });
  rows.push(saved);
  const after = receiptUnassignedPage(parsed, rows, 49);
  assert.equal(after.remaining.length, 498); assert.ok(after.visible.length <= 10);
  assert.ok(!after.remaining.some(row => row.id === name.id || row.id === amount.id));
  const payload = reviewedReceiptInput(rows);
  assert.equal(payload.items.length, 1); assert.equal(payload.items[0].item.totalCostMinor, 4000);
  assert.equal(payload.items[0].item.name, name.original);
  rows.splice(0, 1);
  assert.equal(receiptUnassignedPage(parsed, rows, 0).remaining.length, 500);
  assert.equal(pairReceiptLines(parsed.remaining, name.id, amount.id, rows).id, proposed.id);
});
test('page selection clamps after source removal and handles empty/invalid requests without blank pages', () => {
  const parsed = parseReceiptCandidates(fixture.lines);
  const occupied = [{ sourceLineIds: parsed.remaining.slice(0, 100).map(line => line.id) }];
  const result = receiptUnassignedPage(parsed, occupied, 49);
  assert.equal(result.page, 39); assert.equal(result.pages, 40); assert.equal(result.visible.length, 10);
  const empty = receiptUnassignedPage(parsed, [{ sourceLineIds: parsed.remaining.map(line => line.id) }], 49);
  assert.equal(empty.page, 0); assert.equal(empty.start, 0); assert.equal(empty.end, 0); assert.deepEqual(empty.visible, []);
  for (const page of [NaN, Infinity, -3]) assert.equal(receiptUnassignedPage(parsed, [], page).page, 0);
});
