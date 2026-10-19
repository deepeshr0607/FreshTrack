import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestReceiptBlockPairs } from '../lib/receiptGeometry.ts';
import { saveReceiptCandidate, receiptReviewSummary } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
const cell = (text, x, y, width = .15, height = .02) => ({ text, box: { x, y, width, height } });
const indexed = lines => lines.map((line, index) => ({ ...line, id: `line-${index}` }));
const receipt = (extra = []) => indexed([
  cell('Item', .1, .1), cell('Qty', .4, .1), cell('Amount (INR)', .75, .1),
  cell('123456789012', .1, .2, .23), cell('10.00', .5, .2, .1), cell('60.50', .8, .2, .1), cell('Milk', .1, .23),
  cell('987654321098', .1, .28, .23), cell('25.00', .8, .28, .1), cell('Bread', .1, .31),
  ...extra, cell('Total', .1, .37), cell('85.50', .8, .37, .1),
]);
const names = rows => rows.map(row => row.draft.name);

test('below-code descriptions pair by positions, retaining code/name/amount without quantity inference', () => {
  const lines = receipt(), before = JSON.stringify(lines);
  const rows = suggestReceiptBlockPairs(indexed([...lines].reverse()));
  assert.deepEqual(names(rows), ['Milk', 'Bread']);
  assert.deepEqual(rows.map(row => row.draft.price), ['60.50', '25.00']);
  assert.ok(rows.every(row => row.sourceLineIds.length === 3 && row.original.split('\n').length === 3 &&
    !row.reviewed && !row.selected && !row.draft.quantity && !row.draft.unit && !row.draft.expiresOn));
  assert.equal(new Set(rows.flatMap(row => row.sourceLineIds)).size, 6);
  assert.equal(JSON.stringify(lines), before);
});
test('unit prices, foreign context and zero keep existing exact price semantics', () => {
  const lines = receipt(); lines[2].text = 'Amount (RM)'; lines[8].text = '0.00';
  const rows = suggestReceiptBlockPairs(lines);
  assert.deepEqual(rows.map(row => row.detectedPrice), ['60.50', '0.00']);
  assert.ok(rows.every(row => row.currency === 'unsupported' && row.draft.price === ''));
  lines[2].text = 'Amount (INR)';
  assert.equal(suggestReceiptBlockPairs(lines)[1].draft.price, '0.00');
});
test('code punctuation and a joined count remain provenance, not purchased quantity', () => {
  const lines = receipt(); lines[3].text = '123456789012; 12'; lines[7].text = '987654321098!';
  const rows = suggestReceiptBlockPairs(lines);
  assert.deepEqual(names(rows), ['Milk', 'Bread']);
  assert.ok(rows.every(row => row.draft.quantity === '' && row.original.includes('\n')));
});
test('fragmented descriptions including short fragments abstain instead of dropping fragments', () => {
  assert.deepEqual(names(suggestReceiptBlockPairs(receipt([cell('HU', .3, .23, .04)]))), ['Bread']);
  assert.deepEqual(names(suggestReceiptBlockPairs(receipt([cell('Organic', .1, .25)]))), ['Bread']);
});
test('uncertain price suffixes, two amounts, non-food and existing same-line descriptions do not pair', () => {
  for (const replacement of ['60.505R', '60.50 SR', 'unreadable']) {
    const lines = receipt(); lines[5].text = replacement;
    assert.deepEqual(names(suggestReceiptBlockPairs(lines)), ['Bread']);
  }
  assert.deepEqual(names(suggestReceiptBlockPairs(receipt([cell('90.00', .8, .2, .1)]))), ['Bread']);
  for (const replacement of ['Fish modelling clay', 'Milk 60.50']) {
    const lines = receipt(); lines[6].text = replacement;
    assert.deepEqual(names(suggestReceiptBlockPairs(lines)), ['Bread']);
  }
  const hidden = receipt([cell('Yogurt 20.00', .3, .23)]);
  assert.deepEqual(names(suggestReceiptBlockPairs(hidden)), ['Bread']);
});
test('missing code rows still bound the preceding description; later groceries are not borrowed', () => {
  const lines = receipt(); lines[7].text = '12345';
  const withThird = indexed([...lines.slice(0, 10), cell('123456789055', .1, .36, .23),
    cell('30.00', .8, .36, .1), cell('Apples', .1, .39), cell('Total', .1, .45)]);
  assert.deepEqual(names(suggestReceiptBlockPairs(withThird)), ['Milk', 'Apples']);
  // If the first description is absent, the second must not attach to the first code/amount.
  withThird[6].text = '123';
  assert.deepEqual(names(suggestReceiptBlockPairs(withThird)), ['Apples']);
  // Neither a missing code nor a completely unreadable amount permits borrowing the later name.
  withThird[8].text = '???';
  assert.deepEqual(names(suggestReceiptBlockPairs(withThird)), ['Apples']);
});
test('no heading, no boundary, one code, duplicate code row and date-like codes abstain', () => {
  assert.deepEqual(suggestReceiptBlockPairs(indexed(receipt().filter(line => line.text !== 'Item'))), []);
  assert.deepEqual(suggestReceiptBlockPairs(receipt().slice(0, 10)), []);
  const single = receipt(); single[7].text = 'broken';
  assert.deepEqual(suggestReceiptBlockPairs(single), []);
  const date = receipt(); date[3].text = '19/10/2026';
  assert.deepEqual(suggestReceiptBlockPairs(date), []);
  assert.deepEqual(names(suggestReceiptBlockPairs(receipt([cell('123456789099', .12, .2, .23)]))), ['Bread']);
});
test('excessively distant names and crossing description/table boundaries are rejected', () => {
  const lines = receipt(); lines[9].box.y = .36;
  assert.deepEqual(names(suggestReceiptBlockPairs(lines)), ['Milk']);
  const distant = receipt(); distant[10].box.y = .7; distant[9].box.y = .5;
  assert.deepEqual(names(suggestReceiptBlockPairs(distant)), ['Milk']);
});
test('only explicit field review reaches existing import payload; local code/position provenance is stripped', () => {
  const rows = suggestReceiptBlockPairs(receipt());
  assert.ok(receiptReviewSummary(rows).error);
  const reviewed = rows.map(row => saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'pack' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' }));
  const payload = reviewedReceiptInput(reviewed);
  assert.deepEqual(payload.items.map(row => row.item.totalCostMinor), [6050, 2500]);
  assert.equal(/123456789012|987654321098|sourceLineIds|original|"box"/.test(JSON.stringify(payload)), false);
  assert.equal(receiptReviewSummary(reviewed).error, null);
});
test('fifty-item bound and input validation apply to the new layout too', () => {
  const lines = indexed([cell('Item', .1, 0, .15, .005), cell('Amount', .75, 0, .15, .005),
    ...Array.from({ length: 60 }, (_, i) => [cell(String(123456789000 + i), .1, .02 + i * .012, .23, .004),
      cell('10.00', .8, .02 + i * .012, .1, .004), cell(`Milk ${i}`, .1, .025 + i * .012, .15, .004)]).flat(),
    cell('Total', .1, .75, .15, .005)]);
  const pairs = suggestReceiptBlockPairs(lines);
  assert.equal(pairs.length, 50);
  assert.equal(new Set(pairs.flatMap(row => row.sourceLineIds)).size, 150);
  assert.throws(() => suggestReceiptBlockPairs(Array(501).fill(null)));
});
