import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptProducts, automaticFreshRule, packageExpiryDates } from '../lib/receiptProducts.ts';
import { createReceiptOcrProbe, ReceiptOcrError } from '../lib/receiptOcrProbe.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
import { saveReceiptCandidate, receiptExpiryDraft } from '../lib/receiptCandidates.ts';
import { confirmPrintedReceiptDate } from '../lib/receiptPackageDates.ts';
import { RECEIPT_COLUMN_FIXTURE } from '../lib/receiptGeometryFixtures.ts';
const today = '2026-10-21';

test('camera and upload automatically recognize once; cancellation keeps the prior haul', async () => {
  for (const source of ['camera', 'library']) {
    let image = 'cache:first', calls = 0;
    const disposed = [];
    const store = createReceiptOcrProbe({ choose: async () => image, recognize: async () => { calls++; return ['Spinach Rs. 30.00', 'Biscuits Rs. 20.00']; }, dispose: value => disposed.push(value) }, () => true);
    await store.choose(source, true);
    assert.equal(calls, 1); assert.equal(store.getSnapshot().read, true); assert.equal(store.getSnapshot().busy, false);
    const previous = store.getSnapshot().lines;
    image = null; await store.choose(source, true);
    assert.equal(calls, 1); assert.deepEqual(store.getSnapshot().lines, previous);
    image = 'cache:second'; await store.choose(source, true);
    assert.equal(calls, 2); assert.deepEqual(disposed, ['cache:first']);
    store.clear(); assert.deepEqual(disposed, ['cache:first', 'cache:second']);
  }
});

test('automatic OCR blocks double taps and late recognition after leaving/sign-out', async () => {
  let finish, calls = 0, active = true;
  const disposed = [];
  const store = createReceiptOcrProbe({ choose: async () => 'cache:one', recognize: () => { calls++; return new Promise(resolve => { finish = resolve; }); }, dispose: value => disposed.push(value) }, () => active);
  const reading = store.choose('camera', true);
  await Promise.resolve(); assert.equal(store.getSnapshot().busy, true);
  await store.choose('library', true); assert.equal(calls, 1);
  active = false; store.clear(); finish(['private receipt']); await reading;
  assert.equal(store.getSnapshot().image, null); assert.deepEqual(store.getSnapshot().lines, []);
  assert.deepEqual(disposed, ['cache:one']); assert.equal(store.getSnapshot().busy, false);
});

test('automatic read failures use safe READ errors and can retry without taking another photo', async () => {
  let fail = true;
  const store = createReceiptOcrProbe({ choose: async () => 'cache:one', recognize: async () => { if (fail) throw Error('private path and receipt'); return []; }, dispose: () => {} }, () => true);
  await store.choose('library', true);
  assert.equal(store.getSnapshot().errorCode, 'READ'); assert.doesNotMatch(store.getSnapshot().error, /private/);
  assert.equal(store.getSnapshot().image, 'cache:one');
  fail = false; await store.read(); assert.equal(store.getSnapshot().read, true); assert.deepEqual(store.getSnapshot().lines, []);
  const denied = createReceiptOcrProbe({ choose: async () => { throw new ReceiptOcrError('PERMISSION'); }, recognize: async () => [], dispose: () => {} }, () => true);
  await denied.choose('camera', true); assert.equal(denied.getSnapshot().errorCode, 'PERMISSION');
});

test('a mixed haul gets independent editable fields and fresh estimates while packaged dates stay pending', () => {
  const rows = receiptProducts(['Spinach Rs. 30.00', '2 kg Carrots Rs. 60.00', 'Milk Rs. 65.00', 'Biscuits Rs. 20.00', 'White rice Rs. 100.00', 'Total 275.00'], null, today);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map(row => row.draft.name), ['Spinach', 'Carrots', 'Milk', 'Biscuits', 'White rice']);
  assert.deepEqual(rows.map(row => row.draft.category), ['Produce', 'Produce', 'Dairy', 'Snacks', 'Other']);
  assert.deepEqual(rows.map(row => row.reviewed), [true, true, false, false, false]);
  assert.ok(rows.every(row => row.selected));
  assert.equal(rows[0].draft.expiresOn, '2026-10-23');
  assert.equal(rows[1].draft.expiresOn, '2026-10-28');
  assert.equal(rows[1].draft.quantity, '2'); assert.equal(rows[1].draft.unit, 'kg');
  assert.equal(rows[1].draft.price, '60.00');
  assert.equal(rows[0].expirySelection.preset.baseDate, today);
  assert.ok(rows.slice(2).every(row => !row.expirySelection && !row.draft.expiresOn));
  assert.throws(() => reviewedReceiptInput(rows)); // Cannot silently omit incomplete included products.
  const freshOnly = rows.map(row => ({ ...row, selected: row.reviewed }));
  assert.equal(reviewedReceiptInput(freshOnly).items.length, 2);
});

test('packaged forms, ambiguous names and foods outside the 20-food rules never receive a fresh estimate', () => {
  for (const name of ['Apple juice', 'Frozen chicken', 'Canned carrots', 'UHT milk', 'Spinach soup', 'Mango', 'Biscuits', 'Brown rice', 'Unknown XYZ', 'Ground beef']) {
    assert.equal(automaticFreshRule(name), null, name);
    const [row] = receiptProducts([`${name} Rs. 10.00`], null, today);
    assert.equal(row.reviewed, false, name); assert.equal(row.draft.expiresOn, '', name);
  }
  assert.equal(automaticFreshRule('Chicken').rangeDays[0], 1);
});

test('unknown values, free values, foreign currency, repeated purchases and the review cap survive prefilling', () => {
  const rows = receiptProducts(['Spinach', 'Spinach Rs. 0.00', 'Spinach USD 4.29'], null, today);
  assert.equal(rows.length, 3); assert.equal(new Set(rows.map(row => row.id)).size, 3);
  assert.deepEqual(rows.map(row => row.draft.price).sort(), ['', '', '0.00']);
  const input = reviewedReceiptInput(rows);
  assert.deepEqual(input.items.map(row => row.item.totalCostMinor).sort(), [null, null, 0].sort());
  assert.doesNotMatch(JSON.stringify(input), /original|sourceLineIds|image|USD/);
  assert.equal(receiptProducts(Array(55).fill('Spinach Rs. 1.00'), null, today).length, 50);
  const [invalid] = receiptProducts(['Spinach Rs. 99999999.99'], null, today);
  assert.equal(invalid.reviewed, false); // Bounded validation failure doesn't crash rendering.
});

test('label OCR accepts full tagged dates, separates expiry from manufacture and rejects guesses', () => {
  assert.deepEqual(packageExpiryDates(['MFG 01/10/2026', 'EXP 30/11/2026']), ['2026-11-30']);
  assert.deepEqual(packageExpiryDates(['BEST BEFORE', '28 OCT 2026', 'LOT 123']), ['2026-10-28']);
  assert.deepEqual(packageExpiryDates(['USE BY 2026-12-02', 'EXP 02/12/26']), ['2026-12-02']);
  assert.deepEqual(packageExpiryDates(['MFG 01/10/26 EXP 02/11/26 MRP 40.00']), ['2026-11-02']);
  assert.deepEqual(packageExpiryDates(['EXP 12/11/2026 MFG 01/10/2026']), ['2026-11-12']);
  for (const lines of [['MFG 12/11/2026'], ['12/11/2026'], ['BEST BEFORE 6 MONTHS FROM MFG', 'MFG 12/10/2026'], ['EXP OCT 2026'], ['EXP 31/02/2026'], ['EXP 12/31/2026']]) {
    assert.deepEqual(packageExpiryDates(lines), [], lines.join(' '));
  }
  assert.deepEqual(packageExpiryDates(['EXP 01/12/2026 OR 02/12/2026']), ['2026-12-01', '2026-12-02']);
});

test('confirmed package date and manual correction use existing persisted provenance and strip label content', () => {
  const [row] = receiptProducts(['Milk Rs. 60.00'], null, today);
  const before = structuredClone(row); // Opening/cancelling capture never mutates the candidate.
  packageExpiryDates(['EXP 30/10/2026']); assert.deepEqual(row, before);
  const printed = saveReceiptCandidate({ ...row, packageDateReview: confirmPrintedReceiptDate(row.draft.name, '2026-10-30') },
    { packageDate: '2026-10-30', userDate: '', baseDate: '', days: '' });
  const input = reviewedReceiptInput([printed]);
  assert.equal(input.items[0].item.expirySelection.packageDate, '2026-10-30');
  assert.doesNotMatch(JSON.stringify(input), /EXP |packageDateReview|original/);
  assert.equal(receiptExpiryDraft(printed).packageDate, '2026-10-30');
  const manual = saveReceiptCandidate({ ...printed, packageDateReview: { kind: 'unavailable' } },
    { packageDate: '', userDate: '2026-10-29', baseDate: '', days: '' });
  assert.deepEqual(manual.expirySelection, { packageDate: null, userDate: '2026-10-29', preset: null });
});

test('same-row position matching fills product prices without borrowing unit prices or duplicating names', () => {
  const values = [
    ['Amount (INR)', .75, .1, .15], ['Spinach', .1, .2, .15], ['30.00', .8, .2, .1],
    ['Milk', .1, .3, .15], ['60.00', .8, .3, .1], ['5.00', .5, .3, .1], ['Total', .1, .8, .15],
  ];
  const boxes = values.map(([text, x, y, width], i) => ({ id: `line-${i}`, text, box: { x, y, width, height: .02 } }));
  const lines = boxes.map(row => row.text);
  const rows = receiptProducts(lines, boxes, today);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => [row.draft.name, row.draft.price]), [['Spinach', '30.00'], ['Milk', '60.00']]);
  assert.equal(new Set(rows.flatMap(row => row.sourceLineIds)).size, 4);
  const withoutGeometry = receiptProducts(lines, null, today);
  assert.ok(withoutGeometry.every(row => row.draft.price === '')); // No positional guessing from text order.
  const mismatch = structuredClone(boxes); mismatch[1].text = 'Changed';
  assert.deepEqual(receiptProducts(lines, mismatch, today), withoutGeometry);
});

test('code/amount rows with a single description below also populate automatically without treating codes as quantity', () => {
  const { lines, layout } = RECEIPT_COLUMN_FIXTURE;
  const before = structuredClone(layout);
  const rows = receiptProducts(lines, layout, today);
  assert.deepEqual(rows.map(row => [row.draft.name, row.draft.price, row.draft.quantity]), [['Milk', '60.50', '1'], ['Bread', '25.00', '1']]);
  assert.ok(rows.every(row => !row.reviewed && row.selected && row.sourceLineIds.length === 3));
  assert.equal(new Set(rows.flatMap(row => row.sourceLineIds)).size, 6);
  assert.deepEqual(layout, before);
});
