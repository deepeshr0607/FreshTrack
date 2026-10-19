import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptNameSuggestion, applyReceiptNameSuggestion } from '../lib/receiptNameAliases.ts';
import { receiptQuantityHint, applyReceiptQuantityHint } from '../lib/receiptQuantity.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate, usedReceiptLineIds, pairReceiptLines } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';

test('only explicit whole aliases are suggested with case/spacing normalization', () => {
  for (const [input, expected] of [['mkl   lopft', 'Low-Fat Milk'], ['chkn brst', 'Chicken Breast'], ['WW BRD', 'Whole Wheat Bread'],
    ['BSMT RICE', 'Basmati Rice'], ['BNNA', 'Bananas'], ['TMTO', 'Tomato'], ['PTTO', 'Potato']]) {
    assert.equal(receiptNameSuggestion(input)?.name, expected);
  }
  for (const input of ['MKL UNKNOWN', 'CHKN', 'BNN', 'BRAND CHKN BRST', 'BNNA ROAD', 'BNNA discount', 'BNNA123', 'Milk', 'TOTAL 20.00', 'TMTO\n20.00', 'x'.repeat(121)]) {
    assert.equal(receiptNameSuggestion(input), null, input);
  }
});
test('package size and quantity wrappers survive expansion without becoming inferred fields', () => {
  assert.equal(receiptNameSuggestion('MKL LOPFT 1L')?.name, 'Low-Fat Milk 1L');
  assert.equal(receiptNameSuggestion('2 x WW BRD 400g')?.name, '2 x Whole Wheat Bread 400g');
  assert.equal(receiptNameSuggestion('CHKN BRST Qty: 0.5 kg')?.name, 'Chicken Breast Qty: 0.5 kg');
  assert.equal(receiptNameSuggestion('0.750 kg TMTO')?.name, '0.750 kg Tomato');
  for (const value of ['BNNA 10.00', 'BNNA 1,200.00', 'BNNA 2 oz', 'BNNA Qty: -1 kg']) assert.equal(receiptNameSuggestion(value), null);
  assert.equal(receiptQuantityHint('Low-Fat Milk 1L'), null);
  assert.deepEqual(receiptQuantityHint('2 x Whole Wheat Bread 400g'), { quantity: '2', unit: null, itemText: 'Whole Wheat Bread 400g' });
});
test('abbreviation fixture yields five unrenamed/unreviewed candidates and preserves unknown lines', () => {
  const fixture = RECEIPT_LAYOUT_FIXTURES.find(row => row.name === 'Abbreviation review');
  const parsed = parseReceiptCandidates(fixture.lines), rows = suggestReceiptNameOnlyItems(parsed);
  assert.deepEqual(rows.map(row => row.draft.name), ['MKL LOPFT 1L', 'CHKN BRST Qty: 0.5 kg', 'WW BRD', 'BNNA', 'TMTO']);
  assert.ok(rows.every(row => !row.selected && !row.reviewed && row.draft.quantity === '' && row.draft.unit === '' && row.draft.expiresOn === ''));
  const remaining = parsed.remaining.filter(line => !usedReceiptLineIds(rows).has(line.id));
  assert.deepEqual(remaining.map(row => row.original), ['ITEM DESCRIPTION', 'MKL UNKNOWN', 'Milk Road', 'TOTAL 250.00']);
});
test('Apply and cancellation preserve originals and fields; unknown/custom names are not overwritten', () => {
  const row = parseReceiptCandidates(['MKL LOPFT 1L Rs. 60.00']).candidates[0], before = JSON.stringify(row);
  const draft = applyReceiptNameSuggestion(row.draft);
  assert.equal(draft.name, 'Low-Fat Milk 1L');
  assert.deepEqual({ ...draft, name: row.draft.name }, row.draft);
  assert.equal(JSON.stringify(row), before); // Dropping the editor draft does not mutate the row.
  const custom = { ...draft, name: 'My preferred milk name' };
  assert.equal(applyReceiptNameSuggestion(custom), custom);
  assert.equal(row.original, 'MKL LOPFT 1L Rs. 60.00');
});
test('name and quantity Apply compose; explicit edits survive final reviewed payload', () => {
  const row = parseReceiptCandidates(['CHKN BRST Qty: 0.5 kg Rs. 150.00']).candidates[0];
  const draft = applyReceiptQuantityHint(applyReceiptNameSuggestion(row.draft));
  assert.equal(draft.quantity, '0.5'); assert.equal(draft.unit, 'kg'); assert.equal(draft.price, '150.00');
  const saved = saveReceiptCandidate({ ...row, draft: { ...draft, name: 'My Chicken', quantity: '0.4' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });
  const payload = reviewedReceiptInput([saved]);
  assert.equal(payload.items[0].item.name, 'My Chicken'); assert.equal(payload.items[0].item.quantity, '0.4');
  assert.equal(payload.items[0].item.totalCostMinor, 15000);
  assert.equal(JSON.stringify(payload).includes('CHKN'), false); assert.equal(JSON.stringify(payload).includes('sourceLineIds'), false);
});
test('name-only alias removal frees source matching and does not invent a price or merge repeats', () => {
  const parsed = parseReceiptCandidates(['BNNA', 'BNNA', '20.00']);
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(rows.length, 2); assert.notEqual(rows[0].id, rows[1].id);
  assert.ok(rows.every(row => row.draft.price === ''));
  assert.throws(() => pairReceiptLines(parsed.remaining, 'line-0', 'line-2', rows));
  rows.shift(); const paired = pairReceiptLines(parsed.remaining, 'line-0', 'line-2', rows);
  assert.equal(applyReceiptNameSuggestion(paired.draft).name, 'Bananas'); assert.equal(paired.draft.price, '20.00');
});
test('foreign/unknown values and 20-row source limits are unaffected by alias recognition', () => {
  const foreign = parseReceiptCandidates(['WW BRD $4.29']).candidates[0];
  assert.equal(applyReceiptNameSuggestion(foreign.draft).price, ''); assert.equal(foreign.currency, 'unsupported');
  const parsed = parseReceiptCandidates([...Array.from({ length: 20 }, (_, i) => `Product ${i} 10.00`), 'BNNA']);
  assert.equal(suggestReceiptNameOnlyItems(parsed).length, 20); assert.equal(parsed.remaining[0].original, 'BNNA');
});
