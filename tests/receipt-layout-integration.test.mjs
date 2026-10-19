import test from 'node:test';
import assert from 'node:assert/strict';
import { ocrRecognition, createReceiptOcrProbe, ReceiptOcrError } from '../lib/receiptOcrProbe.ts';
import { receiptColumnProposals } from '../lib/receiptColumnReview.ts';
import { RECEIPT_COLUMN_FIXTURE as fixture } from '../lib/receiptGeometryFixtures.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate, manualReceiptCandidate } from '../lib/receiptCandidates.ts';
const initial = () => suggestReceiptNameOnlyItems(parseReceiptCandidates(fixture.lines));
const packet = () => ({ lines: fixture.lines, boxes: structuredClone(fixture.layout) });
const proposals = rows => receiptColumnProposals(fixture.lines, fixture.layout, rows, 'below-code');
const review = row => saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'piece' } },
  { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });

test('valid native packet retains positions; old string-only and malformed geometry preserve manual text', () => {
  assert.deepEqual(ocrRecognition(packet()), { lines: fixture.lines, layout: fixture.layout });
  assert.deepEqual(ocrRecognition(fixture.lines), { lines: fixture.lines, layout: null });
  for (const alter of [p => { p.boxes[0].text = 'Mismatch'; }, p => { p.boxes[0].box.x = NaN; },
    p => { p.boxes = null; }, p => { p.boxes[0].id = 'wrong'; }]) {
    const p = packet(); alter(p);
    assert.deepEqual(ocrRecognition(p), { lines: fixture.lines, layout: null });
  }
  assert.deepEqual(ocrRecognition({ lines: [' Milk\nBread '], boxes: [] }), { lines: ['Milk', 'Bread'], layout: null });
  for (const value of [null, {}, { lines: ['a', 1] }, { lines: Array(501).fill('a') }]) assert.throws(() => ocrRecognition(value), ReceiptOcrError);
});
test('cancelled picker retains geometry; reread errors clear positions and expose only safe errors', async () => {
  let photo = 'cache:one', fail = false;
  const store = createReceiptOcrProbe({ choose: async () => photo, recognize: async () => { if (fail) throw Error('private file and text'); return packet(); }, dispose: () => {} }, () => true);
  await store.choose('camera'); await store.read();
  assert.deepEqual(store.getSnapshot().layout, fixture.layout);
  photo = null; await store.choose('library'); assert.deepEqual(store.getSnapshot().layout, fixture.layout);
  fail = true; await store.read();
  assert.equal(store.getSnapshot().layout, null); assert.deepEqual(store.getSnapshot().lines, []);
  assert.doesNotMatch(store.getSnapshot().error, /private|file and text/);
  fail = false; await store.read(); assert.deepEqual(store.getSnapshot().layout, fixture.layout);
  store.clear(); assert.equal(store.getSnapshot().layout, null);
});
test('late native positions never survive leaving or an account change', async () => {
  let release, active = true;
  const store = createReceiptOcrProbe({ choose: async () => 'cache:one', recognize: () => new Promise(r => { release = r; }), dispose: () => {} }, () => active);
  await store.choose('camera'); const reading = store.read(); active = false; store.clear(); release(packet()); await reading;
  assert.equal(store.getSnapshot().layout, null); assert.deepEqual(store.getSnapshot().lines, []);
});
test('explicit layout choice creates proposals, upgrades pristine names and Cancel changes no rows', () => {
  const rows = initial(), before = JSON.stringify(rows);
  assert.equal(receiptColumnProposals(fixture.lines, fixture.layout, rows, 'same-row').length, 0);
  const offered = proposals(rows);
  assert.deepEqual(offered.map(row => [row.id, row.draft.name, row.draft.price]), rows.map((row, i) => [row.id, row.draft.name, i ? '25.00' : '60.50']));
  assert.equal(JSON.stringify(rows), before);
  assert.ok(offered.every(row => !row.selected && !row.reviewed && !row.draft.quantity && row.sourceLineIds.length === 3));
});
test('saving one match removes its proposal; reviewed/excluded/date-prefilled rows stay protected', () => {
  const rows = initial(), milk = review(proposals(rows)[0]);
  const saved = [milk, rows[1]];
  assert.deepEqual(proposals(saved).map(row => row.draft.name), ['Bread']);
  saved[0] = { ...milk, selected: false };
  assert.deepEqual(proposals(saved).map(row => row.draft.name), ['Bread']);
  for (const patch of [{ quantity: '2' }, { price: '10.00' }, { name: 'Edited Milk' }, { category: 'Dairy' }, { expiresOn: '2026-11-30' }]) {
    const edited = initial(); edited[0].draft = { ...edited[0].draft, ...patch };
    assert.deepEqual(proposals(edited).map(row => row.draft.name), ['Bread']);
  }
});
test('other source conflicts block a match; removal frees originals and never duplicates a live row', () => {
  const rows = initial();
  const collision = { ...manualReceiptCandidate('manual-conflict'), sourceLineIds: ['line-5'] };
  assert.deepEqual(proposals([...rows, collision]).map(row => row.draft.name), ['Bread']);
  assert.equal(proposals(rows).length, 2);
  const saved = review(proposals(rows)[0]);
  const removed = rows.filter(row => row.id !== saved.id);
  const next = proposals(removed);
  assert.equal(next.length, 2); assert.notEqual(next.find(row => row.draft.name === 'Milk').id, saved.id);
});
test('full review allows only replacements; wrong/missing positions give the existing manual fallback', () => {
  const rows = [...initial(), ...Array.from({ length: 48 }, (_, i) => manualReceiptCandidate(`manual-${i}`))];
  assert.equal(proposals(rows).length, 2);
  rows[0] = manualReceiptCandidate('new-manual');
  assert.deepEqual(proposals(rows).map(row => row.draft.name), ['Bread']);
  assert.deepEqual(receiptColumnProposals(['changed receipt'], fixture.layout, [], 'below-code'), []);
  assert.deepEqual(receiptColumnProposals(fixture.lines, null, [], 'below-code'), []);
});
