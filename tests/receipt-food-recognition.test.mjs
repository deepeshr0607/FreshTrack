import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeReceiptFood, applyReceiptFoodCategory } from '../lib/receiptFoodRecognition.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, createReceiptImportStorage } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
const form = { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' };

test('common receipt foods suggest existing categories and a specific local food identifier', () => {
  for (const [name, category, foodId] of [['Apples', 'Produce', 'apple'], ['Bananas', 'Produce', 'banana'], ['Spinach', 'Produce', 'spinach'],
    ['Milk 500ml', 'Dairy', 'milk'], ['Curd', 'Dairy', 'curd'], ['Cheese', 'Dairy', 'cheese'], ['Chicken breast', 'Meat', 'chicken'],
    ['Fish', 'Meat', 'fish'], ['Whole wheat bread', 'Bakery', 'bread'], ['Buns', 'Bakery', 'bun'], ['Biscuits', 'Snacks', 'biscuit'],
    ['Chips', 'Snacks', 'chips'], ['Rice', 'Other', 'rice'], ['Eggs', 'Other', 'egg'], ['Frozen spinach', 'Frozen', 'spinach'],
    ['Pineapple', 'Produce', 'pineapple'], ['Guava', 'Produce', 'guava'], ['Strawberries', 'Produce', 'strawberry']]) {
    const food = recognizeReceiptFood(name);
    assert.equal(food.status, 'matched', name); assert.equal(food.category, category, name); assert.equal(food.foodId, foodId, name);
  }
});
test('recognized finished product forms take precedence over ingredient words', () => {
  assert.equal(recognizeReceiptFood('Milk biscuits').category, 'Snacks');
  assert.equal(recognizeReceiptFood('Chocolate cake').category, 'Bakery');
  assert.equal(recognizeReceiptFood('Strawberry yogurt').category, 'Dairy');
  assert.equal(recognizeReceiptFood('Cheese bread').category, 'Bakery');
});
test('mixed/prepared foods and plant milk do not become raw-ingredient category claims', () => {
  for (const name of ['Chicken soup', 'Apple juice', 'Milk powder', 'Oat milk', 'Rice milk', 'Coconut milk', 'Milk cheese',
    'Chicken spinach', 'Apple banana', 'Bread cookies', 'Cooked rice', 'Chicken masala', 'Milk flavored drink',
    'Never frozen chicken', 'Non-frozen spinach', 'Non-dairy milk', 'Dairy-free yogurt', 'Peanut butter', 'Coconut yogurt']) {
    const match = recognizeReceiptFood(name);
    assert.equal(match.status, 'ambiguous', name); assert.equal(match.category, 'Other'); assert.equal(match.foodId, null);
  }
});
test('unknowns, metadata and nonfood products avoid substring or guessed food matches', () => {
  for (const name of ['Unknown product XYZ', 'MKL UNKNOWN', 'Pineapplex', 'Chicken shop', 'Milk Road', 'Soap milk', 'Cat chicken food',
    'Dog biscuits', 'Milk\nInvoice', 'x'.repeat(121), '']) {
    const food = recognizeReceiptFood(name); assert.equal(food.status, 'unknown', name); assert.equal(food.category, 'Other');
  }
});
test('supported aliases and quantity wrappers retain food recognition without rewriting input', () => {
  for (const [name, category] of [['MKL LOPFT 1L', 'Dairy'], ['0.5 kg CHKN BRST', 'Meat'], ['WW BRD', 'Bakery'], ['2 x BNNA', 'Produce'], ['TMTO Qty: 2 kg', 'Produce']]) {
    assert.equal(recognizeReceiptFood(name).category, category);
  }
});
test('category suggestions leave every detected draft unreviewed with no inferred dates or quantities', () => {
  const fixture = RECEIPT_LAYOUT_FIXTURES.find(row => row.name === 'Food category review');
  const rows = suggestReceiptNameOnlyItems(parseReceiptCandidates(fixture.lines));
  assert.equal(rows.length, 10);
  assert.deepEqual(rows.map(row => recognizeReceiptFood(row.draft.name).category), ['Produce', 'Dairy', 'Meat', 'Bakery', 'Snacks', 'Frozen', 'Other', 'Other', 'Other', 'Other']);
  assert.ok(rows.every(row => row.draft.category === 'Other' && row.draft.expiresOn === '' && row.draft.quantity === '' && !row.selected && !row.reviewed));
  const applied = applyReceiptFoodCategory(rows[1].draft);
  assert.deepEqual(applied, { ...rows[1].draft, category: 'Dairy' });
  assert.equal(rows[1].draft.category, 'Other'); assert.equal(rows[1].original, 'MKL LOPFT 1L Rs. 60.00');
});
test('cancelled application cannot mutate a row and a later explicit category edit is respected', () => {
  const row = parseReceiptCandidates(['Milk Rs. 60.00']).candidates[0], before = JSON.stringify(row);
  const draft = applyReceiptFoodCategory(row.draft);
  assert.equal(JSON.stringify(row), before);
  const saved = saveReceiptCandidate({ ...row, draft: { ...draft, category: 'Snacks', quantity: '1', unit: 'bottle' } }, form);
  assert.equal(saved.draft.category, 'Snacks'); assert.equal(recognizeReceiptFood(saved.draft.name).category, 'Dairy');
  const payload = reviewedReceiptInput([saved]);
  assert.equal(payload.items[0].item.category, 'SNACKS'); assert.equal(payload.items[0].item.totalCostMinor, 6000);
  assert.equal(payload.items[0].item.expiresOn, '2026-11-30');
});
test('unknown or ambiguous suggestions cannot overwrite a manually selected category', () => {
  for (const name of ['Unknown XYZ', 'Chicken soup']) {
    const draft = { name, category: 'Meat', quantity: '1', unit: 'bag', price: '40.00', expiresOn: '2026-11-30' };
    assert.equal(applyReceiptFoodCategory(draft), draft);
  }
});
test('only the final category enters an immutable retry, without food recognition metadata', async () => {
  const row = parseReceiptCandidates(['Milk Rs. 60.00']).candidates[0];
  const saved = saveReceiptCandidate({ ...row, draft: { ...applyReceiptFoodCategory(row.draft), quantity: '1', unit: 'bottle' } }, form);
  const input = { ...reviewedReceiptInput([saved]), confirmed: true }, values = new Map();
  const io = { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } };
  await createReceiptImportStorage(io, 'category-account').save(input, 'category-retry-123456', true);
  const restored = await createReceiptImportStorage(io, 'category-account').load();
  assert.equal(restored.input.items[0].item.category, 'DAIRY'); assert.equal(restored.input.items[0].item.quantity, '1');
  assert.doesNotMatch(JSON.stringify(restored.input), /foodId|status|matched|label|original|sourceLineIds/);
  await createReceiptImportStorage(io, 'category-account').clear(); assert.equal(values.size, 0);
});
