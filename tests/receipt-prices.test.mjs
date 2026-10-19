import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptCandidates, pairReceiptLines, saveReceiptCandidate, receiptCandidateIssue } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';

test('Western and Indian grouped prices normalize without floating point conversion', () => {
  const parsed = parseReceiptCandidates(['Rice ₹1,200.00', 'Oil Rs. 1,23,456.78', 'Flour 12,345,678.90 INR', 'Milk 0,00', 'Bread 30.00']);
  assert.deepEqual(parsed.candidates.map(row => row.draft.price), ['1200.00', '123456.78', '12345678.90', '0.00', '30.00']);
  assert.deepEqual(parsed.candidates.map(row => row.draft.name), ['Rice', 'Oil', 'Flour', 'Milk', 'Bread']);
  assert.ok(parsed.candidates.every(row => !row.reviewed && !row.selected));
  assert.equal(parsed.candidates[1].original, 'Oil Rs. 1,23,456.78');
});
test('malformed grouping, ambiguous locale, negatives and partial decimals stay recoverable', () => {
  const input = ['Rice 1,20.00', 'Rice 1,200.0', 'Rice 1.200,00', 'Rice 01,200.00', 'Rice 1,200', 'Rice -1,200.00', 'Rice 1,2,345.00', 'Rice 10.00 S'];
  const parsed = parseReceiptCandidates(input);
  assert.equal(parsed.candidates.length, 0); assert.deepEqual(parsed.remaining.map(row => row.original), input);
});
test('RM/MYR same-line and standalone values are foreign and cannot prefill rupees', () => {
  const parsed = parseReceiptCandidates(['Milk RM9.00', 'Bread 4.50 MYR', 'Rice MYR1,200.00', 'RM2.50']);
  assert.ok(parsed.candidates.every(row => row.currency === 'unsupported' && row.draft.price === ''));
  assert.deepEqual(parsed.candidates.map(row => row.detectedPrice), ['9.00', '4.50', '1200.00']);
  assert.equal(parsed.remaining[0].kind, 'amount'); assert.equal(parsed.remaining[0].currency, 'unsupported');
});
test('explicit receipt headers govern unmarked amounts but tagged values retain their own currency', () => {
  for (const header of ['(RM)', 'Amount (RM)', 'Currency: MYR', 'Prices in USD']) {
    const parsed = parseReceiptCandidates([header, 'Milk 9.00', 'Bread INR40.00']);
    assert.equal(parsed.remaining[0].kind, 'other'); assert.equal(parsed.candidates[0].draft.price, '');
    assert.equal(parsed.candidates[0].currency, 'unsupported'); assert.equal(parsed.candidates[1].draft.price, '40.00');
  }
  const indian = parseReceiptCandidates(['Currency: INR', 'Rice 1,200.00']);
  assert.equal(indian.candidates[0].currency, 'INR'); assert.equal(indian.candidates[0].draft.price, '1200.00');
  const mixed = parseReceiptCandidates(['Currency: INR', 'Currency: RM', 'Milk 9.00', 'Bread INR40.00']);
  assert.equal(mixed.candidates[0].draft.price, ''); assert.equal(mixed.candidates[1].draft.price, '40.00');
  assert.equal(parseReceiptCandidates(['Milk 9.00']).candidates[0].currency, 'unspecified'); // No context leaks across scans.
});
test('explicit separate-column matching retains foreign header context and exact grouped values', () => {
  const parsed = parseReceiptCandidates(['Amount (RM)', 'Bananas', '1,200.00']);
  const row = pairReceiptLines(parsed.remaining, 'line-1', 'line-2', []);
  assert.equal(row.currency, 'unsupported'); assert.equal(row.detectedPrice, '1200.00'); assert.equal(row.draft.price, '');
  const local = parseReceiptCandidates(['Currency: INR', 'Rice', '1,23,456.78']);
  const rice = pairReceiptLines(local.remaining, 'line-1', 'line-2', []);
  assert.equal(rice.draft.price, '123456.78'); assert.equal(rice.currency, 'INR');
  assert.deepEqual(rice.sourceLineIds, ['line-1', 'line-2']);
});
test('financial adjustments never become groceries or silently change item purchase values', () => {
  const parsed = parseReceiptCandidates(['Rice ₹1,200.00', 'Discount -100.00', 'Rice discount 100.00', 'Rice coupon 50.00',
    'Rice - 20.00', 'Refund 20.00', 'TOTAL 1,100.00', 'CGST 10.00']);
  assert.deepEqual(parsed.candidates.map(row => row.draft.price), ['1200.00']); assert.equal(parsed.remaining.length, 7);
});
test('review keeps exact paise, zero/unknown distinction and explicit user corrections', () => {
  const parsed = parseReceiptCandidates(['Rice ₹1,200.00', 'Milk RM9.00', 'Bread ₹0.00']);
  const rows = parsed.candidates.map(row => saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'piece' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' }));
  assert.deepEqual(reviewedReceiptInput(rows).items.map(row => row.item.totalCostMinor), [120000, null, 0]);
  const corrected = saveReceiptCandidate({ ...rows[0], draft: { ...rows[0].draft, price: '1100.00' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });
  assert.equal(reviewedReceiptInput([corrected]).items[0].item.totalCostMinor, 110000);
  assert.equal(JSON.stringify(reviewedReceiptInput(rows)).includes('currencyContext'), false);
});
test('grouped prices do not bypass existing value bounds or row caps', () => {
  const parsed = parseReceiptCandidates(['Rice ₹2,14,74,836.48', ...Array.from({ length: 21 }, (_, i) => `Item ${i} 10.00`)]);
  assert.equal(parsed.candidates.length, 20); assert.equal(parsed.remaining.length, 2);
  assert.ok(receiptCandidateIssue({ ...parsed.candidates[0].draft, quantity: '1', unit: 'bag', expiresOn: '2026-11-30' }));
});
