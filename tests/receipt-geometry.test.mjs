import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptTextBoxes, suggestReceiptGeometryPairs } from '../lib/receiptGeometry.ts';
const make = (text, x, y, width = .15, height = .02) => ({ text, box: { x, y, width, height } });
const indexed = lines => lines.map((line, index) => ({ id: `line-${index}`, ...line }));
const receipt = (extra = []) => indexed([
  make('Amount (INR)', .75, .1), make('Milk', .1, .2), make('60.50', .8, .2, .1),
  make('Bread', .1, .3), make('25.00', .8, .3, .1), ...extra,
  make('Total', .1, .8), make('85.50', .8, .8, .1),
]);
test('positions, not string ordering, pair same-row cells with exact originals and no approval', () => {
  const lines = receipt(), before = JSON.stringify(lines);
  // Move amounts in the observation sequence without moving their physical positions.
  const shuffled = indexed([lines[0], lines[4], lines[1], lines[3], lines[2], ...lines.slice(5)].map(({ id, ...rest }) => rest));
  const pairs = suggestReceiptGeometryPairs(shuffled);
  assert.deepEqual(pairs.map(row => [row.draft.name, row.draft.price]), [['Bread', '25.00'], ['Milk', '60.50']]);
  assert.ok(pairs.every(row => !row.selected && !row.reviewed && row.sourceLineIds.length === 2 &&
    !row.draft.quantity && !row.draft.unit && !row.draft.expiresOn));
  assert.equal(JSON.stringify(lines), before);
  assert.equal(pairs.some(row => row.detectedPrice === '85.50'), false);
});
test('unit prices do not replace the explicitly labelled amount column; foreign values stay blank', () => {
  const lines = receipt([make('9.99', .5, .2, .1)]);
  lines[0].text = 'Amt(RM)';
  const pairs = suggestReceiptGeometryPairs(lines);
  assert.equal(pairs.length, 2);
  assert.ok(pairs.every(row => row.currency === 'unsupported' && row.draft.price === ''));
  assert.deepEqual(pairs.map(row => row.detectedPrice), ['60.50', '25.00']);
});
test('missing/duplicate column headings and missing footer abstain without discarding lines', () => {
  for (const input of [receipt().slice(1), receipt([make('Amount', .75, .4)]), receipt().slice(0, 5)]) {
    assert.deepEqual(suggestReceiptGeometryPairs(indexed(input.map(({ id, ...rest }) => rest))), []);
  }
});
test('two names on a row, two amounts in one column and vertical offsets abstain', () => {
  assert.equal(suggestReceiptGeometryPairs(receipt([make('Yogurt', .3, .2)])).length, 1);
  assert.equal(suggestReceiptGeometryPairs(receipt([make('90.00', .8, .2, .1)])).length, 1);
  const offset = receipt(); offset[1].box.y += .03;
  assert.deepEqual(suggestReceiptGeometryPairs(offset).map(row => row.draft.name), ['Bread']);
});
test('non-food, summaries and unchanged same-line candidates are not paired again', () => {
  const lines = receipt(); lines[1].text = 'Fish modelling clay'; lines[3].text = 'Bread 25.00';
  assert.deepEqual(suggestReceiptGeometryPairs(lines), []);
  const summary = receipt(); summary[3].text = 'Tax';
  assert.deepEqual(suggestReceiptGeometryPairs(summary).map(row => row.draft.name), ['Milk']);
});
test('invalid, nonfinite, out-of-range, multiline, duplicate-ID and excessive inputs reject safely', () => {
  for (const mutate of [r => { r[1].box.x = NaN; }, r => { r[1].box.width = 0; },
    r => { r[1].box.x = .99; }, r => { r[1].id = 'line-0'; }, r => { r[1].text = 'Milk\nBread'; },
    r => { r[1].text = ''; }, r => { r[1].text = 'a'.repeat(10001); }]) {
    const rows = receipt(); mutate(rows); assert.throws(() => receiptTextBoxes(rows), /Invalid receipt layout/);
  }
  assert.throws(() => receiptTextBoxes(Array(501).fill(null)));
  assert.throws(() => receiptTextBoxes(null));
  assert.throws(() => receiptTextBoxes(Array(2)));
});
test('later summary tables cannot supply extra headings or price matches to the grocery table', () => {
  const lines = indexed([...receipt().map(({ id, ...rest }) => rest), make('Amount', .75, .9), make('999.00', .8, .94, .1)]);
  assert.deepEqual(suggestReceiptGeometryPairs(lines).map(row => row.draft.price), ['60.50', '25.00']);
});
test('large geometry input respects the shared fifty-item cap without reusing sources', () => {
  const lines = indexed([make('Amount', .75, 0, .15, .005), ...Array.from({ length: 60 }, (_, i) => [
    make(`Milk ${i}`, .1, .02 + i * .01, .15, .005), make('10.00', .8, .02 + i * .01, .1, .005),
  ]).flat(), make('Total', .1, .9, .15, .005)]);
  const pairs = suggestReceiptGeometryPairs(lines);
  assert.equal(pairs.length, 50);
  assert.equal(new Set(pairs.flatMap(row => row.sourceLineIds)).size, 100);
});
