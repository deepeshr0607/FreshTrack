import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, pairReceiptLines, saveReceiptCandidate, usedReceiptLineIds } from '../lib/receiptCandidates.ts';
import { recognizeReceiptFood } from '../lib/receiptFoodRecognition.ts';
import { receiptStorageRules } from '../lib/receiptShelfLife.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';

test('non-food receipts with food words cannot suggest groceries, categories or shelf-life rules', () => {
  // Synthetic regressions for the public modelling-clay negative control; no copied receipt transcript.
  for (const name of ['Modelling clay fish', 'Modelingclay fish', 'Modellingclay fish', 'Fish toy', 'Banana toys', 'Milk soap',
    'Rice shampoo', 'Apple lotion', 'Chicken dog food', 'Milk detergent', 'Cat chicken food']) {
    const parsed = parseReceiptCandidates([name, '9.00']);
    assert.equal(suggestReceiptNameOnlyItems(parsed).length, 0, name);
    assert.equal(recognizeReceiptFood(name).status, 'unknown', name);
    assert.deepEqual(receiptStorageRules(name), [], name);
    assert.equal(parsed.remaining.length, 2); // Still available for explicit manual review, never discarded.
    const priced = parseReceiptCandidates([`${name} 9.00`]);
    assert.equal(priced.candidates.length, 0, name); assert.equal(priced.remaining[0].kind, 'other');
    assert.equal(priced.remaining[0].original, `${name} 9.00`);
  }
});
test('negative-control exclusions do not remove whole food names or claypot dishes by substring', () => {
  const parsed = parseReceiptCandidates(['Fish', 'Bananas', 'Milk', 'Claypot rice']);
  assert.equal(suggestReceiptNameOnlyItems(parsed).length, 4);
  assert.equal(recognizeReceiptFood('Fish').category, 'Meat');
  assert.equal(receiptStorageRules('Fish')[0].id, 'fish');
});
test('abbreviated foreign headers already protect separate unit/line prices and do not imply a match', () => {
  const lines = ['Amt (RM)', 'Chocolate biscuits', '0.85', '15.25', 'Sub total', '15.25'];
  const parsed = parseReceiptCandidates(lines), suggestions = suggestReceiptNameOnlyItems(parsed);
  assert.equal(parsed.candidates.length, 0); assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].draft.price, '');
  assert.ok(parsed.remaining.filter(row => row.kind === 'amount').every(row => row.currency === 'unsupported'));
  // A human chooses the line total rather than the nearby unit price; no positional join is made.
  const paired = pairReceiptLines(parsed.remaining, 'line-1', 'line-3', []);
  assert.equal(paired.detectedPrice, '15.25'); assert.equal(paired.draft.price, '');
  assert.deepEqual(paired.sourceLineIds, ['line-1', 'line-3']);
  const available = parsed.remaining.filter(row => !usedReceiptLineIds([paired]).has(row.id));
  assert.ok(available.some(row => row.id === 'line-2'));
  const saved = saveReceiptCandidate({ ...paired, draft: { ...paired.draft, quantity: '17', unit: 'pack' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });
  const body = reviewedReceiptInput([saved]); assert.equal(body.items[0].item.totalCostMinor, null);
  assert.equal(body.items[0].item.quantity, '17'); assert.doesNotMatch(JSON.stringify(body), /original|sourceLineIds/);
});
test('uncertain price/tax suffix stays unassigned instead of borrowing a repeated total', () => {
  const lines = ['Unknown dairy product', '75.005R', 'Sub total', '75.00', 'TOTAL', '75.00'];
  const parsed = parseReceiptCandidates(lines);
  assert.equal(parsed.candidates.length, 0); assert.deepEqual(parsed.remaining.map(row => row.original), lines);
  assert.equal(parsed.remaining[1].kind, 'other');
  assert.equal(suggestReceiptNameOnlyItems(parsed).length, 0);
});
