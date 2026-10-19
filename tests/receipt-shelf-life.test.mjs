import test from 'node:test';
import assert from 'node:assert/strict';
import { RECEIPT_STORAGE_RULES, receiptStorageRules, applyReceiptStorageRule } from '../lib/receiptShelfLife.ts';
import { parseReceiptCandidates, saveReceiptCandidate, receiptExpiryDraft } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, createReceiptImportStorage } from '../lib/receiptImport.ts';
import { resolveExpiry } from '../lib/pantryExpiry.ts';
const blank = () => ({ packageDate: '', userDate: '', baseDate: '', days: '' });
const today = '2026-10-19';
test('specific confirmed storage conditions use the lower end of sourced ranges, not category defaults', () => {
  for (const [name, rule, days] of [['Spinach', 'greens', 2], ['Lettuce', 'greens', 2], ['CHKN BRST', 'chicken', 1],
    ['Potatoes', 'roots', 14], ['Onions', 'roots', 14], ['Strawberries', 'berries', 2], ['Pears', 'pear', 5],
    ['Carrots', 'carrot', 7], ['Broccoli', 'brassicas', 3], ['Cabbage', 'brassicas', 3], ['Eggs', 'eggs', 21]]) {
    const options = receiptStorageRules(name); assert.equal(options.length, 1, name); assert.equal(options[0].id, rule);
    assert.equal(applyReceiptStorageRule(name, rule, today, today, blank()).days, String(days));
  }
  assert.equal(new Set(RECEIPT_STORAGE_RULES.map(row => row.id)).size, RECEIPT_STORAGE_RULES.length);
  for (const rule of RECEIPT_STORAGE_RULES) {
    assert.ok(rule.rangeDays[0] > 0 && rule.rangeDays[0] <= rule.rangeDays[1]);
    assert.match(rule.sourceUrl, /^https:\/\/(?:www.foodsafety.gov|extension.umd.edu)\//);
  }
});
test('package dates, food preparations, ambiguous foods and unsupported storage never get a guessed rule', () => {
  for (const name of ['Milk', 'Rice', 'Milk biscuits', 'Unknown XYZ', 'Chicken soup', 'Milk cheese', 'Frozen spinach',
    'Dried spinach', 'Canned carrots', 'Cut pears', 'Peeled carrots', 'Sliced cabbage', 'Thawed chicken', 'Roasted chicken',
    'Cooked chicken', 'Boiled eggs', 'Pickled onions', 'Instant potatoes', 'Spinach puree']) {
    assert.deepEqual(receiptStorageRules(name), [], name);
    assert.throws(() => applyReceiptStorageRule(name, 'greens', today, today, blank()), /supported/);
  }
  assert.throws(() => applyReceiptStorageRule('Spinach', 'chicken', today, today, blank()));
});
test('confirmed purchase dates are strict, cannot be future, and use existing leap/month calendar math', () => {
  for (const date of ['', '2026-02-30', '2026-10-20', '19/10/2026', '0000-01-01']) {
    assert.throws(() => applyReceiptStorageRule('Spinach', 'greens', date, today, blank()), undefined, date);
  }
  assert.throws(() => applyReceiptStorageRule('Spinach', 'greens', today, 'invalid', blank()));
  for (const [base, date] of [['2028-02-28', '2028-03-01'], ['2026-12-31', '2027-01-02']]) {
    const draft = applyReceiptStorageRule('Spinach', 'greens', base, '2029-01-01', blank());
    assert.equal(resolveExpiry({ packageDate: null, userDate: null, preset: { baseDate: draft.baseDate, days: Number(draft.days) } }).expiresOn, date);
  }
});
test('applying cannot mutate a row or overwrite printed/manual dates; custom estimates change only on explicit application', () => {
  const original = blank(); const applied = applyReceiptStorageRule('Spinach', 'greens', today, today, original);
  assert.deepEqual(original, blank()); assert.deepEqual(applied, { ...blank(), baseDate: today, days: '2' });
  for (const override of [{ packageDate: '2026-11-01' }, { userDate: '2026-11-02' }]) {
    const prior = { ...blank(), ...override }; assert.throws(() => applyReceiptStorageRule('Spinach', 'greens', today, today, prior), /priority/);
    assert.deepEqual(prior, { ...blank(), ...override });
  }
});
test('review retains exact accepted dates/base/days and manual/package precedence discards the estimate', () => {
  const row = parseReceiptCandidates(['Spinach Rs. 30.00']).candidates[0];
  const ready = { ...row, draft: { ...row.draft, category: 'Produce', quantity: '1', unit: 'bag' } };
  const fields = applyReceiptStorageRule(row.draft.name, 'greens', today, today, blank());
  const saved = saveReceiptCandidate(ready, fields);
  assert.equal(saved.draft.expiresOn, '2026-10-21'); assert.deepEqual(receiptExpiryDraft(saved), fields);
  assert.equal(row.draft.expiresOn, ''); assert.equal(row.reviewed, false);
  const custom = saveReceiptCandidate(ready, { ...fields, days: '3' }); assert.equal(custom.draft.expiresOn, '2026-10-22');
  for (const [key, date] of [['packageDate', '2026-10-20'], ['userDate', '2026-10-23']]) {
    const override = saveReceiptCandidate(ready, { ...fields, [key]: date });
    assert.equal(override.draft.expiresOn, date); assert.equal(override.expirySelection.preset, null);
  }
});
test('accepted expiry survives durable retry without storage-condition claims or recomputation', async () => {
  const row = parseReceiptCandidates(['Chicken breast Rs. 120.00']).candidates[0];
  const saved = saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'bag' } },
    applyReceiptStorageRule(row.draft.name, 'chicken', today, today, blank()));
  const input = { ...reviewedReceiptInput([saved]), confirmed: true };
  const values = new Map(), io = { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } };
  const storage = createReceiptImportStorage(io, 'storage-rule-account');
  await storage.save(input, 'storage-retry-key-123456', true);
  const restored = await createReceiptImportStorage(io, 'storage-rule-account').load();
  assert.deepEqual(restored.input, input); assert.equal(restored.input.items[0].item.expiresOn, '2026-10-20');
  assert.deepEqual(restored.input.items[0].item.expirySelection.preset, { baseDate: today, days: 1 });
  assert.doesNotMatch(JSON.stringify(restored.input), /condition|rangeDays|sourceUrl|ruleId/);
  await storage.clear(); assert.equal(values.size, 0);
});
