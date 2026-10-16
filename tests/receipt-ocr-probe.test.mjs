import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptOcrProbe, ocrLines, ReceiptOcrError } from '../lib/receiptOcrProbe.ts';

test('OCR lines preserve recognized prices and uncertainty without inventing groceries, with bounded output', () => {
  assert.deepEqual(ocrLines([' MILK 60.50\nTOTAL 60.50 ', '', '???']), ['MILK 60.50', 'TOTAL 60.50', '???']);
  assert.deepEqual(ocrLines([]), []);
  for (const value of [null, ['x', 1], Array(501).fill('x'), ['x'.repeat(10001)], Array(10).fill('x'.repeat(6000))]) assert.throws(() => ocrLines(value), ReceiptOcrError);
});
test('picker cancellation retains prior preview; read failure is redacted, retry and empty results recover', async () => {
  let photo = 'cache:first', fail = false, result = ['milk']; const disposed = [];
  const store = createReceiptOcrProbe({ choose: async () => photo, recognize: async () => { if (fail) throw Error('private receipt path and provider internals'); return result; }, dispose: uri => disposed.push(uri) }, () => true);
  await store.choose('library'); await store.read(); assert.deepEqual(store.getSnapshot().lines, ['milk']);
  photo = null; await store.choose('camera'); assert.equal(store.getSnapshot().image, 'cache:first');
  fail = true; await store.read(); assert.equal(store.getSnapshot().read, false); assert.deepEqual(store.getSnapshot().lines, []);
  assert.doesNotMatch(store.getSnapshot().error, /private|provider/); assert.equal(store.getSnapshot().image, 'cache:first');
  fail = false; result = []; await store.read(); assert.equal(store.getSnapshot().read, true); assert.equal(store.getSnapshot().error, '');
  photo = 'cache:second'; await store.choose('library'); assert.deepEqual(disposed, ['cache:first']);
  store.clear(); assert.deepEqual(disposed, ['cache:first', 'cache:second']); assert.equal(store.getSnapshot().image, null);
});
test('duplicate taps coalesce; leaving/account change discards late photos and OCR results', async () => {
  let release, calls = 0, active = true; const disposed = [];
  const store = createReceiptOcrProbe({ choose: () => { calls++; return new Promise(r => { release = r; }); }, recognize: () => new Promise(r => { release = r; }), dispose: uri => disposed.push(uri) }, () => active);
  const pick = store.choose('camera'); await store.choose('camera'); assert.equal(calls, 1);
  active = false; release('cache:late'); await pick; assert.deepEqual(disposed, ['cache:late']); assert.equal(store.getSnapshot().image, null);
  active = true; const next = store.choose('library'); release('cache:current'); await next;
  const read = store.read(); store.clear(); release(['private late result']); await read;
  assert.deepEqual(store.getSnapshot().lines, []); assert.equal(store.getSnapshot().image, null); assert.equal(store.getSnapshot().busy, false);
});
