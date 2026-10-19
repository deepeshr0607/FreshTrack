import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptCandidates, pairReceiptLines, usedReceiptLineIds, saveReceiptCandidate, receiptReviewSummary } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
const form = { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' };
function fixture() { return parseReceiptCandidates(RECEIPT_LAYOUT_FIXTURES[0].lines); }
function reviewed(row) { return saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'bag' } }, form); }

test('separate columns preserve every line and never pair automatically, even with equal counts', () => {
  const parsed = fixture();
  assert.equal(parsed.candidates.length, 0);
  assert.deepEqual(parsed.remaining.map(row => row.kind), ['other', 'name', 'name', 'amount', 'amount', 'other', 'other']);
  assert.deepEqual(parsed.remaining.map(row => row.original), RECEIPT_LAYOUT_FIXTURES[0].lines);
  assert.equal(receiptReviewSummary(parsed.candidates).rows.length, 0);
});
test('only an explicitly selected name and amount become a suggestion with both source lines', () => {
  const parsed = fixture(), before = JSON.stringify(parsed);
  // Deliberately choose the later price: equal-sized columns are not positional instructions.
  const pair = pairReceiptLines(parsed.remaining, 'line-1', 'line-4', []);
  assert.equal(pair.draft.name, 'Layout Test Rice'); assert.equal(pair.draft.price, '60.50');
  assert.equal(pair.currency, 'INR'); assert.equal(pair.original, 'Layout Test Rice\nRs. 60.50');
  assert.deepEqual(pair.sourceLineIds, ['line-1', 'line-4']);
  assert.equal(pair.draft.quantity, ''); assert.equal(pair.draft.unit, ''); assert.equal(pair.draft.expiresOn, '');
  assert.equal(pair.selected, false); assert.equal(pair.reviewed, false);
  assert.equal(JSON.stringify(parsed), before);
});
test('standalone currency values are amount lines, never groceries named Rs/INR/USD', () => {
  const input = ['Rs. 60.50', 'INR 40.00', '₹0.00', '30,00', '$4.29', '4.29 EUR'];
  const parsed = parseReceiptCandidates(input);
  assert.equal(parsed.candidates.length, 0); assert.ok(parsed.remaining.every(row => row.kind === 'amount'));
  const mixed = parseReceiptCandidates(['Milk Rs. 60.50', 'Bread 30,00', ...input]);
  assert.deepEqual(mixed.candidates.map(row => row.draft.name), ['Milk', 'Bread']);
  assert.deepEqual(mixed.candidates.map(row => row.draft.price), ['60.50', '30.00']);
});
test('missing, wrong-type, summary, consumed and over-capacity choices are rejected', () => {
  const parsed = fixture();
  for (const [name, price] of [['line-0', 'line-3'], ['line-5', 'line-3'], ['line-3', 'line-1'], ['missing', 'line-3'], ['line-1', 'line-1']]) {
    assert.throws(() => pairReceiptLines(parsed.remaining, name, price, []));
  }
  const first = pairReceiptLines(parsed.remaining, 'line-1', 'line-3', []);
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-2', 'line-3', [first]));
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-1', 'line-4', [first]));
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-2', 'line-4', Array(20).fill(first)));
  const valid = pairReceiptLines(parsed.remaining, 'line-2', 'line-4', [first]); assert.equal(valid.draft.price, '60.50');
});
test('cancel is non-mutating; removing a matched row frees both source lines', () => {
  const parsed = fixture(), rows = [];
  const proposed = pairReceiptLines(parsed.remaining, 'line-1', 'line-3', rows);
  assert.equal(usedReceiptLineIds(rows).size, 0); // Cancel an editor without adding its proposal.
  const saved = reviewed(proposed); rows.push(saved);
  assert.deepEqual([...usedReceiptLineIds(rows)], ['line-1', 'line-3']);
  assert.equal(parsed.remaining.filter(line => !usedReceiptLineIds(rows).has(line.id)).length, 5);
  rows.splice(0, 1);
  assert.equal(usedReceiptLineIds(rows).size, 0);
  assert.equal(pairReceiptLines(parsed.remaining, 'line-1', 'line-3', rows).id, proposed.id);
});
test('foreign, unmarked and zero amounts retain the same explicit currency/unknown semantics', () => {
  const parsed = parseReceiptCandidates(['Yogurt', '$4.29', 'Bread', '0,00', 'Rice', '40.00']);
  const foreign = pairReceiptLines(parsed.remaining, 'line-0', 'line-1', []);
  assert.equal(foreign.currency, 'unsupported'); assert.equal(foreign.draft.price, ''); assert.equal(foreign.detectedPrice, '4.29');
  const zero = pairReceiptLines(parsed.remaining, 'line-2', 'line-3', []);
  assert.equal(zero.currency, 'unspecified'); assert.equal(zero.draft.price, '0.00');
  const unmarked = pairReceiptLines(parsed.remaining, 'line-4', 'line-5', []);
  assert.equal(unmarked.currency, 'unspecified'); assert.equal(unmarked.draft.price, '40.00');
});
test('ambiguous formats, column headings and financial summaries remain recoverable without automatic rows', () => {
  const input = ['PRICE', 'Rate 10.00', 'Subtotal 60.50', 'Discount -5.00', 'Rice 1,20.00', 'TOTAL', '60.50', 'Milk', 'Bread', '40.00'];
  const parsed = parseReceiptCandidates(input);
  assert.equal(parsed.candidates.length, 0); assert.equal(parsed.remaining.length, input.length);
  assert.ok(parsed.remaining.slice(0, 6).every(row => row.kind === 'other'));
  assert.equal(parsed.remaining[6].kind, 'amount'); // A human must check this amount against the photo.
});
test('paired reviews preserve edits and expiry, strip local provenance and use the existing import contract', () => {
  const parsed = fixture();
  const rice = reviewed(pairReceiptLines(parsed.remaining, 'line-1', 'line-3', []));
  const milk = reviewed(pairReceiptLines(parsed.remaining, 'line-2', 'line-4', [rice]));
  rice.draft.name = 'Edited Layout Rice';
  const input = reviewedReceiptInput([rice, milk]);
  assert.deepEqual(input.items.map(row => [row.item.name, row.item.totalCostMinor, row.item.quantity]), [['Edited Layout Rice', 4000, '1'], ['Layout Test Milk', 6050, '1']]);
  assert.ok(input.items.every(row => row.item.expirySelection.userDate === '2026-11-30'));
  assert.equal(JSON.stringify(input).includes('sourceLineIds'), false); assert.equal(JSON.stringify(input).includes('Rs.'), false);
  assert.equal(input.items[0].rowId, rice.id); assert.equal(receiptReviewSummary([rice, milk]).error, null);
  assert.ok(receiptReviewSummary([rice, { ...milk, sourceLineIds: rice.sourceLineIds }]).error);
});
test('existing 20-row limit and 500-line bounds preserve split lines for manual recovery', () => {
  const parsed = parseReceiptCandidates([...Array.from({ length: 20 }, (_, i) => `Item ${i} 10.00`), 'Milk', '60.50']);
  assert.equal(parsed.candidates.length, 20); assert.equal(parsed.remaining.length, 2);
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-20', 'line-21', parsed.candidates));
  assert.equal(parseReceiptCandidates(Array(500).fill('60.50')).remaining.length, 500);
  assert.throws(() => parseReceiptCandidates(Array(501).fill('60.50')));
});
