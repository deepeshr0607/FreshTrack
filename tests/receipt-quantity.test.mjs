import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptQuantityHint, applyReceiptQuantityHint } from '../lib/receiptQuantity.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';

test('leading measured quantity normalizes explicit units and decimal comma without changing item text', () => {
  for (const [name, quantity, unit, itemText] of [
    ['0.750 kg Apples', '0.750', 'kg', 'Apples'], ['0,5 KGS Chicken', '0.5', 'kg', 'Chicken'],
    ['250 grams Spinach', '250', 'g', 'Spinach'], ['1.5 LITRES Milk', '1.5', 'l', 'Milk'],
    ['500 ml Milk', '500', 'ml', 'Milk'], ['6 pcs Eggs', '6', 'piece', 'Eggs'], ['2 packets Biscuits', '2', 'pack', 'Biscuits'],
  ]) assert.deepEqual(receiptQuantityHint(name), { quantity, unit, itemText });
});
test('explicit count suggests quantity only and never multiplies package sizes', () => {
  assert.deepEqual(receiptQuantityHint('2 x Milk 500ml'), { quantity: '2', unit: null, itemText: 'Milk 500ml' });
  assert.deepEqual(receiptQuantityHint('3 × Bread 400g'), { quantity: '3', unit: null, itemText: 'Bread 400g' });
  for (const name of ['Milk 500ml', 'Rice 5kg', 'Bread 400g', '2 x 500ml Milk', 'Milk 2 x 500ml']) assert.equal(receiptQuantityHint(name), null);
});
test('explicit trailing Qty/Quantity label supports optional unit and requires the whole suffix', () => {
  assert.deepEqual(receiptQuantityHint('Eggs Qty: 6 pcs'), { quantity: '6', unit: 'piece', itemText: 'Eggs' });
  assert.deepEqual(receiptQuantityHint('Bananas quantity = 2 kg'), { quantity: '2', unit: 'kg', itemText: 'Bananas' });
  assert.deepEqual(receiptQuantityHint('Milk Qty 2'), { quantity: '2', unit: null, itemText: 'Milk' });
  assert.equal(receiptQuantityHint('Milk Qty 2 120.00'), null);
});
test('invalid, over-precision, conflicting or unsupported syntax cannot produce a quantity hint', () => {
  for (const name of ['0 kg Apples', '-2 kg Rice', '01 kg Rice', '1.2345 kg Rice', '1000000000 kg Rice',
    '0 x Milk', '0.5 x Milk', '1e2 kg Rice', '2 oz Chicken', '2 x Milk Qty 3', 'Apples Qty 2 kg Qty 3',
    '2 kg 3 x Milk', '2 kg !', 'Milk\nQty 2', 'x'.repeat(121)]) assert.equal(receiptQuantityHint(name), null, name);
});
test('explicit Apply changes quantity/unit only; count with no unit preserves the user unit', () => {
  const draft = { name: '0.750 kg Apples', quantity: '9', unit: 'bag', category: 'Produce', price: '45.00', expiresOn: '2026-11-30' };
  const before = JSON.stringify(draft), applied = applyReceiptQuantityHint(draft);
  assert.deepEqual(applied, { ...draft, quantity: '0.750', unit: 'kg' });
  assert.equal(JSON.stringify(draft), before);
  assert.deepEqual(applyReceiptQuantityHint({ ...draft, name: '2 x Milk 500ml', unit: 'bottle' }), { ...draft, name: '2 x Milk 500ml', quantity: '2', unit: 'bottle' });
  assert.equal(applyReceiptQuantityHint({ ...draft, name: '2 x Milk 500ml', unit: '' }).unit, '');
  const sized = { ...draft, name: 'Milk 500ml' }; assert.equal(applyReceiptQuantityHint(sized), sized);
});
test('quantity fixture keeps all initial drafts blank and does not multiply whole-entry prices', () => {
  const fixture = RECEIPT_LAYOUT_FIXTURES.find(item => item.name === 'Quantity review');
  const parsed = parseReceiptCandidates(fixture.lines), rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(rows.length, 5);
  assert.ok(rows.every(row => row.draft.quantity === '' && row.draft.unit === '' && !row.selected && !row.reviewed));
  const milk = rows.find(row => row.draft.name === '2 x Milk 500ml');
  const applied = applyReceiptQuantityHint(milk.draft);
  assert.equal(applied.quantity, '2'); assert.equal(applied.unit, ''); assert.equal(applied.price, '120.00');
  assert.equal(receiptQuantityHint(rows.find(row => row.draft.name === 'Milk 500ml').draft.name), null);
});
test('decimal quantity without a price becomes a suggestion without borrowing amounts or populating fields', () => {
  const rows = suggestReceiptNameOnlyItems(parseReceiptCandidates(['0.750 kg Apples', '45.00', 'Milk Store Qty 2', 'TOTAL 45.00']));
  assert.equal(rows.length, 1); assert.equal(rows[0].draft.name, '0.750 kg Apples');
  assert.equal(rows[0].draft.price, ''); assert.equal(rows[0].draft.quantity, ''); assert.equal(rows[0].draft.unit, '');
});
test('reviewed manual correction takes precedence and import includes only final fields', () => {
  const row = parseReceiptCandidates(['0.750 kg Apples Rs. 45.00']).candidates[0];
  const applied = applyReceiptQuantityHint(row.draft);
  const saved = saveReceiptCandidate({ ...row, draft: { ...applied, name: 'Reviewed Apples', quantity: '0.5', unit: 'kg', category: 'Produce' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' });
  const payload = reviewedReceiptInput([saved]);
  assert.equal(payload.items[0].item.quantity, '0.5'); assert.equal(payload.items[0].item.totalCostMinor, 4500);
  assert.equal(payload.items[0].item.name, 'Reviewed Apples');
  assert.equal(JSON.stringify(payload).includes('sourceLineIds'), false); assert.equal(JSON.stringify(payload).includes('original'), false);
});
