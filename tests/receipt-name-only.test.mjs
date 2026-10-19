import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, usedReceiptLineIds, pairReceiptLines, saveReceiptCandidate, receiptReviewSummary } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
const fixture = RECEIPT_LAYOUT_FIXTURES.find(item => item.name === 'Items without prices');
const form = { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' };

test('mixed receipt proposes supported names without requiring a price or assigning nearby amounts', () => {
  const parsed = parseReceiptCandidates(fixture.lines), before = JSON.stringify(parsed);
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.deepEqual(rows.map(row => row.draft.name), ['Milk', 'Bananas', 'Chicken breast', 'Whole wheat bread', 'Basmati rice', 'Chocolate biscuits']);
  for (const row of rows) {
    assert.equal(row.draft.price, ''); assert.equal(row.detectedPrice, null);
    assert.equal(row.currency, 'unspecified'); assert.equal(row.draft.category, 'Other');
    assert.equal(row.draft.quantity, ''); assert.equal(row.draft.unit, ''); assert.equal(row.draft.expiresOn, '');
    assert.equal(row.selected, false); assert.equal(row.reviewed, false);
    assert.equal(row.sourceLineIds.length, 1);
  }
  assert.equal(JSON.stringify(parsed), before);
  assert.equal(receiptReviewSummary(rows).error, 'Review and select at least one grocery.');
  const available = parsed.remaining.filter(line => !usedReceiptLineIds(rows).has(line.id));
  assert.equal(available.length, 7); assert.ok(available.some(line => line.original === '₹60.00'));
});
test('store/address/payment food words and uncertain numeric text do not become name-only groceries', () => {
  const lines = ['Milk Store', 'Rice Road', 'Salt Trading', 'Tea Market', 'Cashier: Milk', 'Chicken discount', 'Bread points',
    'Milk 6O.5O', 'Rice 1,20.00', 'TOTAL 50.00', '₹50.00', 'Unknown XYZ', 'PAPER BAG', 'www.milk.example'];
  const parsed = parseReceiptCandidates(lines);
  assert.equal(suggestReceiptNameOnlyItems(parsed).length, 0);
  assert.equal(parsed.remaining.length, lines.length);
});
test('same-line candidates retain priority and the shared cap leaves overflow available', () => {
  const parsed = parseReceiptCandidates(['Milk', 'Bread', ...Array.from({ length: 19 }, (_, i) => `Product ${i} 10.00`)]);
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(rows.length, 20); assert.deepEqual(rows.slice(0, 19), parsed.candidates);
  assert.equal(rows[19].draft.name, 'Milk');
  const available = parsed.remaining.filter(line => !usedReceiptLineIds(rows).has(line.id));
  assert.deepEqual(available.map(line => line.original), ['Bread']);
});
test('repeated purchases stay distinct and rerunning suggestions is deterministic', () => {
  const parsed = parseReceiptCandidates(['Milk', 'Milk', 'Eggs', 'Eggs']);
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(new Set(rows.map(row => row.id)).size, 4);
  assert.deepEqual(rows, suggestReceiptNameOnlyItems(parsed));
  assert.equal(usedReceiptLineIds(rows).size, 4);
});
test('removal releases the name for explicit matching; cancel and excluded rows cannot reuse sources', () => {
  const parsed = parseReceiptCandidates(['Milk', '60.50']);
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-0', 'line-1', rows));
  assert.equal(usedReceiptLineIds([{ ...rows[0], selected: false }]).size, 1);
  rows.splice(0, 1);
  const proposal = pairReceiptLines(parsed.remaining, 'line-0', 'line-1', rows);
  assert.equal(usedReceiptLineIds(rows).size, 0); // Cancelling the proposal leaves both lines unused.
  assert.equal(proposal.draft.price, '60.50'); assert.equal(proposal.draft.name, 'Milk');
});
test('unknown and explicit zero values survive review; original OCR and provenance stay out of import fields', () => {
  const parsed = parseReceiptCandidates(['Milk', 'Bread']);
  const rows = suggestReceiptNameOnlyItems(parsed).map((row, index) => saveReceiptCandidate({ ...row,
    draft: { ...row.draft, name: index === 0 ? 'Corrected milk name' : row.draft.name, quantity: '1', unit: 'piece', price: index === 0 ? '' : '0' } }, form));
  const payload = reviewedReceiptInput(rows);
  assert.deepEqual(payload.items.map(row => row.item.totalCostMinor), [null, 0]);
  assert.equal(payload.items[0].item.name, 'Corrected milk name');
  assert.ok(payload.items.every(row => row.item.expiresOn === '2026-11-30'));
  assert.equal(JSON.stringify(payload).includes('sourceLineIds'), false);
  assert.equal(JSON.stringify(payload).includes('original'), false);
});
test('500-line bound is retained without losing names beyond the 20-row review cap', () => {
  const parsed = parseReceiptCandidates(Array(500).fill('Bananas'));
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(rows.length, 20);
  assert.equal(parsed.remaining.filter(line => !usedReceiptLineIds(rows).has(line.id)).length, 480);
  assert.throws(() => parseReceiptCandidates(Array(501).fill('Bananas')));
});
