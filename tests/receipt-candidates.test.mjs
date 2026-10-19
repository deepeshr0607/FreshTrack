import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptCandidates, manualReceiptCandidate, receiptCandidateIssue, receiptReviewSummary } from '../lib/receiptCandidates.ts';

test('receipt parsing keeps same-line items separate, excludes summaries and preserves original OCR', () => {
  const input = [' SHOP #12 ', 'MILK ₹60.50', 'BREAD 30,00', '2 x Apples Rs. 80.00', 'SUB TOTAL 170.50', 'CGST 3.00', 'TOTAL: 173.50', 'UPI 173.50', 'THANK YOU', 'Milk', '60.50'];
  const result = parseReceiptCandidates(input);
  assert.deepEqual(result.candidates.map(row => row.draft.name), ['MILK', 'BREAD', '2 x Apples']);
  assert.deepEqual(result.candidates.map(row => row.draft.price), ['60.50', '30.00', '80.00']);
  assert.deepEqual(result.candidates.map(row => row.currency), ['INR', 'unspecified', 'INR']);
  assert.equal(result.remaining.length + result.candidates.length, input.length);
  for (const row of result.candidates) {
    assert.equal(row.draft.quantity, ''); assert.equal(row.draft.unit, ''); assert.equal(row.draft.expiresOn, '');
    assert.equal(row.reviewed, false); assert.equal(row.selected, false); assert.equal(row.draft.category, 'Other');
  }
  assert.equal(result.candidates[2].original, '2 x Apples Rs. 80.00');
  assert.equal(receiptReviewSummary(result.candidates).error, 'Review and select at least one grocery.');
});
test('foreign currencies, ambiguous price formats and layout overflow never silently convert or disappear', () => {
  const result = parseReceiptCandidates(['Yogurt $4.29', 'Bread 3.99 EUR', 'Rice 1,200.00', 'Milk 6O.5O', '2026-10-16', ...Array.from({ length: 25 }, (_, i) => `Item ${i} 10.00`)]);
  assert.equal(result.candidates.length, 20);
  assert.equal(result.remaining.length, 10);
  assert.equal(result.candidates[0].draft.price, ''); assert.equal(result.candidates[0].detectedPrice, '4.29');
  assert.equal(result.candidates[1].currency, 'unsupported');
  assert.equal(result.candidates[2].draft.price, '1200.00');
  assert.equal(result.remaining.filter(line => line.reason.includes('limit')).length, 8);
  assert.throws(() => parseReceiptCandidates(Array(501).fill('Milk 10.00')));
});
test('review requires explicit fields, validates real-form bounds and retains unknown versus free prices', () => {
  const row = manualReceiptCandidate('missing-1', 'OCR???');
  assert.equal(row.draft.name, ''); assert.equal(row.original, 'OCR???');
  const valid = { name: 'Milk', quantity: '1', unit: 'bottle', category: 'Dairy', expiresOn: '2026-10-20', price: '' };
  assert.equal(receiptCandidateIssue(valid), null);
  for (const patch of [{ quantity: '0' }, { quantity: '1.0001' }, { quantity: '1e2' }, { expiresOn: '2026-02-30' }, { unit: '' }, { category: 'Unknown' }, { price: '21474836.48' }, { price: '1.001' }, { name: 'a'.repeat(121) }, { unit: 'a'.repeat(33) }]) assert.ok(receiptCandidateIssue({ ...valid, ...patch }));
  for (const price of ['', '0', '0.00', '21474836.47']) assert.equal(receiptCandidateIssue({ ...valid, price }), null);
  assert.ok(receiptReviewSummary([{ ...row, draft: valid, selected: true }]).error);
  const first = { ...row, draft: valid, selected: true, reviewed: true };
  const second = { ...first, id: 'second', draft: { ...valid, name: '  MILK ', price: '0' } };
  const before = JSON.stringify([first, second]);
  const plan = receiptReviewSummary([first, second]);
  assert.equal(plan.error, null); assert.equal(plan.rows.length, 2); assert.deepEqual(plan.repeated, ['  MILK ']);
  assert.equal(plan.rows[0].draft.price, ''); assert.equal(plan.rows[1].draft.price, '0');
  assert.equal(JSON.stringify([first, second]), before);
  assert.ok(receiptReviewSummary([first, { ...second, id: first.id }]).error);
  assert.equal(receiptReviewSummary([first, { ...second, selected: false }]).rows.length, 1);
});
