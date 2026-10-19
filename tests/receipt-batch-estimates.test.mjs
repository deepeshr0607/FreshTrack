import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmReceiptPurchaseDate, receiptEstimateOptions, prepareReceiptEstimateBatch, applyReceiptEstimateBatch } from '../lib/receiptBatchEstimates.ts';
import { parseReceiptCandidates, receiptExpiryDraft, saveReceiptCandidate } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, createReceiptImportStorage } from '../lib/receiptImport.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
const today = '2026-10-19';
const rows = () => parseReceiptCandidates(['Spinach Rs. 30.00', 'Rice Rs. 100.00', 'Brown rice Rs. 90.00', 'Milk Rs. 60.00', 'Unknown XYZ Rs. 10.00']).candidates;
const preview = values => prepareReceiptEstimateBatch(values, today, today, { 'line-0': 'greens', 'line-1': 'rice-white-dry' });

test('one confirmed receipt date must be a real nonfuture calendar date, never inferred from OCR', () => {
  assert.equal(confirmReceiptPurchaseDate(today, today), today);
  assert.equal(confirmReceiptPurchaseDate('2024-02-29', today), '2024-02-29');
  for (const value of ['', '2026-02-30', '0000-01-01', '19/10/2026', '2026-10-20']) assert.throws(() => confirmReceiptPurchaseDate(value, today));
  assert.throws(() => confirmReceiptPurchaseDate(today, 'invalid'));
  const values = rows(); assert.throws(() => prepareReceiptEstimateBatch(values, '', today, { 'line-0': 'greens' }));
  assert.ok(values.every(row => row.draft.expiresOn === ''));
});
test('preview requires explicit per-item conditions, preserves generic rice ambiguity and does not mutate anything', () => {
  const values = rows(), before = structuredClone(values);
  assert.deepEqual(receiptEstimateOptions(values[1]).map(rule => rule.id), ['rice-white-dry', 'rice-brown-dry']);
  assert.throws(() => prepareReceiptEstimateBatch(values, today, today, {}), /at least one/);
  const plan = preview(values);
  assert.deepEqual(plan.estimates.map(row => [row.name, row.expiresOn]), [['Spinach', '2026-10-21'], ['Rice', '2027-10-19']]);
  assert.equal(plan.purchaseDate, today); assert.deepEqual(values, before); // Cancelling preview has no side effects.
  assert.equal(plan.estimates.length, 2); // Unchosen supported Milk/Brown rice are not selected for us.
  for (const choices of [{ 'line-1': 'greens' }, { 'line-2': 'rice-white-dry' }, { missing: 'greens' }, { 'line-4': 'greens' }]) {
    assert.throws(() => prepareReceiptEstimateBatch(values, today, today, choices));
  }
});
test('apply only prefills chosen dates; review/selection, categories, prices, quantities and originals are untouched', () => {
  const values = rows(), before = structuredClone(values), applied = applyReceiptEstimateBatch(values, preview(values), today);
  assert.deepEqual(values, before);
  applied.forEach((row, index) => {
    assert.equal(row.reviewed, false); assert.equal(row.selected, false);
    assert.equal(row.draft.category, values[index].draft.category); assert.equal(row.draft.price, values[index].draft.price);
    assert.equal(row.draft.quantity, ''); assert.equal(row.draft.unit, ''); assert.equal(row.original, values[index].original);
    assert.deepEqual(row.sourceLineIds, values[index].sourceLineIds);
  });
  assert.equal(applied[0].draft.expiresOn, '2026-10-21'); assert.equal(applied[1].draft.expiresOn, '2027-10-19');
  assert.equal(applied[2], values[2]); assert.equal(applied[3], values[3]);
  assert.throws(() => reviewedReceiptInput(applied)); // Bulk conditions do not bypass mandatory field review.
  assert.deepEqual(receiptExpiryDraft(applied[0]), { packageDate: '', userDate: '', baseDate: today, days: '2' });
});
test('package/manual/custom estimates and reviewed-excluded groceries are protected', () => {
  const base = rows()[0];
  const forms = [
    { packageDate: '2026-10-23', userDate: '', baseDate: '', days: '' },
    { packageDate: '', userDate: '2026-10-24', baseDate: '', days: '' },
    { packageDate: '', userDate: '', baseDate: '2026-10-17', days: '9' },
  ];
  for (const form of forms) {
    const saved = { ...saveReceiptCandidate({ ...base, draft: { ...base.draft, quantity: '1', unit: 'bag' } }, form), selected: false };
    assert.deepEqual(receiptEstimateOptions(saved), []);
    assert.throws(() => prepareReceiptEstimateBatch([saved], today, today, { [saved.id]: 'greens' }));
  }
  for (const row of [{ ...base, reviewed: true }, { ...base, draft: { ...base.draft, expiresOn: '2026-10-25' } },
    { ...base, expirySelection: { packageDate: null, userDate: null, preset: { baseDate: today, days: 7 } } }]) {
    assert.deepEqual(receiptEstimateOptions(row), []);
  }
});
test('snapshot refuses renamed, removed, edited and changed-selection groceries before applying any date', () => {
  const values = rows(), plan = preview(values);
  const variants = [values.slice(1), values.map((row, i) => i ? row : { ...row, draft: { ...row.draft, name: 'Chicken' } }),
    values.map((row, i) => i ? row : { ...row, draft: { ...row.draft, price: '40.00' } }),
    values.map((row, i) => i ? row : { ...row, selected: true })];
  for (const changed of variants) {
    const before = structuredClone(changed); assert.throws(() => applyReceiptEstimateBatch(changed, plan, today), /changed/); assert.deepEqual(changed, before);
  }
  const applied = applyReceiptEstimateBatch(values, plan, today);
  assert.throws(() => applyReceiptEstimateBatch(applied, plan, today), /changed/); // Repeated confirmation cannot rebase or duplicate outcomes.
});
test('tampered preview dates, names, rules and duplicate IDs are rejected atomically', () => {
  const values = rows(), original = preview(values);
  for (const patch of [{ expiresOn: '2026-11-30' }, { days: 90 }, { name: 'Unreviewed rename' }, { ruleId: 'chicken' }]) {
    const plan = structuredClone(original); Object.assign(plan.estimates[0], patch);
    assert.throws(() => applyReceiptEstimateBatch(values, plan, today));
  }
  const repeated = structuredClone(original); repeated.estimates.push(repeated.estimates[0]);
  assert.throws(() => applyReceiptEstimateBatch(values, repeated, today), /Duplicate/);
  assert.ok(values.every(row => !row.draft.expiresOn));
});
test('changing the shared purchase date never rebases existing prefills or saved item overrides', () => {
  const values = applyReceiptEstimateBatch(rows(), preview(rows()), today);
  const another = prepareReceiptEstimateBatch(values, '2026-10-18', today, { 'line-2': 'rice-brown-dry' });
  const applied = applyReceiptEstimateBatch(values, another, today);
  assert.equal(applied[0], values[0]); assert.equal(applied[1], values[1]);
  assert.equal(receiptExpiryDraft(applied[0]).baseDate, today);
  assert.equal(receiptExpiryDraft(applied[2]).baseDate, '2026-10-18');
  assert.equal(applied[2].draft.expiresOn, '2027-04-16');
  const manual = saveReceiptCandidate({ ...applied[0], draft: { ...applied[0].draft, quantity: '1', unit: 'bag' } },
    { ...receiptExpiryDraft(applied[0]), userDate: '2026-10-20' });
  assert.equal(manual.draft.expiresOn, '2026-10-20'); assert.equal(manual.expirySelection.preset, null);
});
test('fifty rows retain all explicit choices across the receipt limit, including the last row', () => {
  const values = parseReceiptCandidates(Array.from({ length: 50 }, (_, i) => `Spinach ${i + 1} Rs. 10.00`)).candidates;
  const choices = Object.fromEntries(values.map(row => [row.id, 'greens']));
  const plan = prepareReceiptEstimateBatch(values, today, today, choices), applied = applyReceiptEstimateBatch(values, plan, today);
  assert.equal(plan.estimates.length, 50); assert.equal(applied[49].draft.expiresOn, '2026-10-21');
  assert.throws(() => prepareReceiptEstimateBatch([...values, { ...values[0], id: 'extra' }], today, today, choices));
  assert.throws(() => prepareReceiptEstimateBatch([values[0], values[0]], today, today, choices));
});
test('twenty-food confirmed-date prefills survive individual field approval and immutable durable retry', async () => {
  const fixture = RECEIPT_LAYOUT_FIXTURES.find(row => row.name === 'Project showcase (20 foods)');
  const values = parseReceiptCandidates(fixture.lines).candidates;
  const choices = Object.fromEntries(values.map(row => [row.id, receiptEstimateOptions(row)[0].id]));
  const applied = applyReceiptEstimateBatch(values, prepareReceiptEstimateBatch(values, today, today, choices), today);
  const saved = applied.map(row => saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'pack' } }, receiptExpiryDraft(row)));
  const input = { ...reviewedReceiptInput(saved), confirmed: true }, valuesByKey = new Map();
  const io = { get: async key => valuesByKey.get(key) ?? null, set: async (key, value) => { valuesByKey.set(key, value); }, remove: async key => { valuesByKey.delete(key); } };
  const store = createReceiptImportStorage(io, 'batch-purchase-date');
  await store.save(input, 'batch-purchase-date-123456', true);
  const restored = await createReceiptImportStorage(io, 'batch-purchase-date').load();
  assert.deepEqual(restored.input, input); assert.equal(restored.input.items.length, 20);
  assert.ok(restored.input.items.every(row => row.item.expirySelection.preset.baseDate === today));
  assert.doesNotMatch(JSON.stringify(restored.input), /expectedRows|ruleId|original|sourceLineIds/);
  await store.clear(); assert.equal(valuesByKey.size, 0);
});
