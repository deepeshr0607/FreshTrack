import test from 'node:test';
import assert from 'node:assert/strict';
import { RECEIPT_STORAGE_RULES, receiptStorageRules, receiptStorageNotice, applyReceiptStorageRule } from '../lib/receiptShelfLife.ts';
import { parseReceiptCandidates, saveReceiptCandidate, receiptExpiryDraft } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, createReceiptImportStorage } from '../lib/receiptImport.ts';
import { resolveExpiry } from '../lib/pantryExpiry.ts';
import { RECEIPT_LAYOUT_FIXTURES } from '../lib/receiptLayoutFixtures.ts';
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
    assert.match(rule.sourceUrl, /^https:\/\/(?:www.foodsafety.gov|extension.umd.edu|ask.fsis.usda.gov|www.pubs.ext.vt.edu|extension.usu.edu)\//);
  }
});
test('package dates, food preparations, ambiguous foods and unsupported storage never get a guessed rule', () => {
  for (const name of ['Milk biscuits', 'Unknown XYZ', 'Chicken soup', 'Milk cheese', 'Frozen spinach',
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

test('milk and rice rules are conditional choices with distinct durations and no default type selection', () => {
  assert.deepEqual(receiptStorageRules('MKL LOPFT 1L').map(rule => rule.id), ['milk-refrigerated']);
  assert.deepEqual(receiptStorageRules('Rice').map(rule => rule.id), ['rice-white-dry', 'rice-brown-dry']);
  assert.deepEqual(receiptStorageRules('White basmati rice').map(rule => rule.id), ['rice-white-dry']);
  assert.deepEqual(receiptStorageRules('Brown basmati rice').map(rule => rule.id), ['rice-brown-dry']);
  assert.deepEqual(receiptStorageRules('2 kg Brown rice').map(rule => rule.id), ['rice-brown-dry']);
  for (const name of ['Milk', 'White rice', 'Brown rice']) {
    const row = parseReceiptCandidates([`${name} Rs. 10.00`]).candidates[0];
    receiptStorageRules(row.draft.name); assert.equal(row.draft.expiresOn, ''); assert.equal(row.reviewed, false); assert.equal(row.selected, false);
  }
});
test('fresh milk choice is unavailable for incompatible treatments, opened milk and dairy substitutes', () => {
  for (const name of ['Raw milk', 'Unpasteurized milk', 'Unpasteurised milk', 'Not pasteurized milk', 'Non-pasteurised milk',
    'UHT milk', 'Ultra pasteurized milk', 'Ultrapasteurized milk', 'Shelfstable milk', 'Shelf-stable milk', 'Sterilised milk',
    'Opened milk', 'Powdered milk', 'Dry milk', 'Reconstituted milk', 'Condensed milk', 'Evaporated milk', 'Infant milk',
    'Breast milk', 'Almond milk', 'Soy milk', 'Rice milk', 'Milk powder', 'Boiled milk', 'Milk biscuits']) {
    assert.deepEqual(receiptStorageRules(name), [], name);
    assert.throws(() => applyReceiptStorageRule(name, 'milk-refrigerated', today, today, blank()));
  }
});
test('dry rice choices exclude cooked/prepared rice, other varieties and contradictory explicit types', () => {
  for (const name of ['Cooked rice', 'Fried rice', 'Boiled rice', 'Puffed rice', 'Instant rice', 'Ready rice', 'Rice porridge',
    'Rice noodles', 'Rice flour', 'Sushi rice', 'Rice biryani', 'Black rice', 'Wild rice', 'Red rice', 'Brown white rice']) {
    assert.deepEqual(receiptStorageRules(name), [], name);
    assert.throws(() => applyReceiptStorageRule(name, 'rice-white-dry', today, today, blank()));
  }
  assert.throws(() => applyReceiptStorageRule('Brown rice', 'rice-white-dry', today, today, blank()));
  assert.throws(() => applyReceiptStorageRule('White rice', 'rice-brown-dry', today, today, blank()));
  assert.match(receiptStorageNotice('Cooked rice'), /cooking-time and cooling/);
  assert.match(receiptStorageNotice('UHT milk'), /printed milk date/);
});
test('milk/rice application uses exact calendar dates, validates dates and preserves higher priority choices', () => {
  for (const [name, id, days, date] of [['Milk', 'milk-refrigerated', '7', '2026-10-26'],
    ['White rice', 'rice-white-dry', '365', '2027-10-19'], ['Brown rice', 'rice-brown-dry', '180', '2027-04-17']]) {
    const current = blank(), fields = applyReceiptStorageRule(name, id, today, today, current);
    assert.equal(fields.days, days); assert.deepEqual(current, blank());
    const row = parseReceiptCandidates([`${name} Rs. 10.00`]).candidates[0];
    const saved = saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'bag' } }, fields);
    assert.equal(saved.draft.expiresOn, date); assert.deepEqual(receiptExpiryDraft(saved), fields);
    assert.throws(() => applyReceiptStorageRule(name, id, '2026-10-20', today, current), /future/);
    assert.throws(() => applyReceiptStorageRule(name, id, '2026-02-30', today, current));
    assert.throws(() => applyReceiptStorageRule(name, id, today, today, { ...current, packageDate: '2026-10-20' }), /priority/);
    assert.throws(() => applyReceiptStorageRule(name, id, today, today, { ...current, userDate: '2026-10-21' }), /priority/);
  }
});
test('mixed milk/rice fixture remains entirely unreviewed until explicit field review', () => {
  const fixture = RECEIPT_LAYOUT_FIXTURES.find(row => row.name === 'Milk and rice expiry review');
  const rows = parseReceiptCandidates(fixture.lines).candidates;
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.map(row => receiptStorageRules(row.draft.name).length), [1, 2, 1, 0, 0, 0, 0]);
  assert.ok(rows.every(row => !row.reviewed && !row.selected && row.draft.expiresOn === '' && row.draft.quantity === ''));
});
test('milk and rice accepted dates survive durable retry without recomputing a year or six months at restart', async () => {
  const candidates = parseReceiptCandidates(['Milk Rs. 10.00', 'White rice Rs. 10.00', 'Brown rice Rs. 10.00']).candidates;
  const rows = [['Milk', 'milk-refrigerated'], ['White rice', 'rice-white-dry'], ['Brown rice', 'rice-brown-dry']].map(([name, id], index) => {
    const row = candidates[index];
    return saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'bag' } }, applyReceiptStorageRule(name, id, today, today, blank()));
  });
  const input = { ...reviewedReceiptInput(rows), confirmed: true }, values = new Map();
  const io = { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } };
  const store = createReceiptImportStorage(io, 'milk-rice-account');
  await store.save(input, 'milk-rice-retry-123456', true);
  const restored = await createReceiptImportStorage(io, 'milk-rice-account').load();
  assert.deepEqual(restored.input, input);
  assert.deepEqual(restored.input.items.map(row => row.item.expiresOn), ['2026-10-26', '2027-10-19', '2027-04-17']);
  assert.doesNotMatch(JSON.stringify(restored.input), /ruleId|sourceUrl|confirmationLabel|condition/);
  await store.clear(); assert.equal(values.size, 0);
});
