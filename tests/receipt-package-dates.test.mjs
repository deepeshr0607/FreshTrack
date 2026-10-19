import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmPrintedReceiptDate, validateReceiptPackageDateReview, receiptPackageDateLabel } from '../lib/receiptPackageDates.ts';
import { parseReceiptCandidates, saveReceiptCandidate, receiptExpiryDraft, receiptReviewSummary } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, cleanReceiptInput, createReceiptImportStorage } from '../lib/receiptImport.ts';
import { prepareReceiptEstimateBatch, applyReceiptEstimateBatch } from '../lib/receiptBatchEstimates.ts';
const printed = { packageDate: '2026-11-30', userDate: '', baseDate: '', days: '' };
const manual = { packageDate: '', userDate: '2026-11-25', baseDate: '', days: '' };
const estimated = { packageDate: '', userDate: '', baseDate: '2026-10-19', days: '7' };
function candidate(name = 'Chocolate biscuits') {
  const row = parseReceiptCandidates([`${name} Rs. 30.00`]).candidates[0];
  return { ...row, draft: { ...row.draft, quantity: '1', unit: 'pack' }, packageDateReview: { kind: 'unchecked' } };
}

test('unchecked or unavailable printed dates cannot become PACKAGE_DATE without explicit matched confirmation', () => {
  for (const kind of ['unchecked', 'unavailable', 'not-applicable']) {
    assert.throws(() => saveReceiptCandidate({ ...candidate(), packageDateReview: { kind } }, printed), /Confirm/);
  }
  for (const date of ['', '2026-02-30', '0000-01-01', '30/11/2026']) assert.throws(() => confirmPrintedReceiptDate('Biscuits', date));
  for (const name of ['', 'x'.repeat(121), 'Milk\nTotal']) assert.throws(() => confirmPrintedReceiptDate(name, printed.packageDate));
  const row = candidate(), before = structuredClone(row), check = confirmPrintedReceiptDate(row.draft.name, printed.packageDate);
  assert.deepEqual(row, before); // Cancel after confirming has no effect on stored rows.
  const saved = saveReceiptCandidate({ ...row, packageDateReview: check }, printed);
  assert.equal(saved.draft.expiresOn, '2026-11-30'); assert.equal(saved.expirySelection.packageDate, '2026-11-30');
  assert.equal(receiptPackageDateLabel(saved.packageDateReview), 'Printed date checked by you');
});
test('unreadable/manual and unchecked/custom estimates keep their actual unverified source', () => {
  const manualRow = saveReceiptCandidate({ ...candidate(), packageDateReview: { kind: 'unavailable' } }, manual);
  const estimateRow = saveReceiptCandidate(candidate(), estimated);
  assert.equal(manualRow.expirySelection.userDate, '2026-11-25'); assert.equal(manualRow.expirySelection.packageDate, null);
  assert.equal(estimateRow.expirySelection.packageDate, null); assert.equal(estimateRow.expirySelection.userDate, null);
  assert.deepEqual(estimateRow.expirySelection.preset, { baseDate: '2026-10-19', days: 7 });
  assert.match(receiptPackageDateLabel(manualRow.packageDateReview), /unreadable or unavailable/);
  assert.equal(receiptPackageDateLabel(estimateRow.packageDateReview), 'Printed date not checked');
  assert.throws(() => saveReceiptCandidate({ ...candidate(), packageDateReview: { kind: 'unavailable' } }, { ...manual, userDate: '' }));
});
test('a changed date/name or cleared package choice requires confirmation again', () => {
  const row = candidate(), check = confirmPrintedReceiptDate(row.draft.name, printed.packageDate);
  const checked = { ...row, packageDateReview: check };
  assert.throws(() => saveReceiptCandidate(checked, { ...printed, packageDate: '2026-12-01' }), /changed/);
  assert.throws(() => saveReceiptCandidate({ ...checked, draft: { ...row.draft, name: 'Different biscuits' } }, printed), /changed/);
  assert.throws(() => saveReceiptCandidate(checked, manual), /changed/);
  const corrected = saveReceiptCandidate({ ...row, packageDateReview: confirmPrintedReceiptDate(row.draft.name, '2026-12-01') }, { ...printed, packageDate: '2026-12-01' });
  assert.equal(corrected.draft.expiresOn, '2026-12-01');
});
test('printed priority discards lower manual/estimate choices and no-package declaration does not invent a date', () => {
  const row = candidate();
  const saved = saveReceiptCandidate({ ...row, packageDateReview: confirmPrintedReceiptDate(row.draft.name, printed.packageDate) }, { ...estimated, ...printed, userDate: '2026-11-28' });
  assert.deepEqual(saved.expirySelection, { packageDate: '2026-11-30', userDate: null, preset: null });
  assert.deepEqual(receiptExpiryDraft(saved), printed);
  const fresh = saveReceiptCandidate({ ...candidate('Apples'), packageDateReview: { kind: 'not-applicable' } }, estimated);
  assert.match(receiptPackageDateLabel(fresh.packageDateReview), /Loose\/fresh/);
  assert.equal(fresh.expirySelection.packageDate, null);
  assert.throws(() => saveReceiptCandidate({ ...candidate('Apples'), packageDateReview: { kind: 'not-applicable' } }, { packageDate: '', userDate: '', baseDate: '', days: '' }));
});
test('inconsistent local declaration is rejected during selected haul/wire preparation, not just editor Save', () => {
  const row = candidate(), saved = saveReceiptCandidate({ ...row, packageDateReview: confirmPrintedReceiptDate(row.draft.name, printed.packageDate) }, printed);
  const changed = { ...saved, packageDateReview: { kind: 'unchecked' } };
  assert.ok(receiptReviewSummary([changed]).error); assert.throws(() => reviewedReceiptInput([changed]));
  for (const review of [{ kind: 'fake' }, { kind: 'unchecked', date: '2026-11-30' }, { ...saved.packageDateReview, extra: true }]) {
    assert.throws(() => validateReceiptPackageDateReview(saved.draft.name, { expiresOn: saved.draft.expiresOn, expirySource: 'PACKAGE_DATE' }, review));
  }
});
test('batch prefills preserve unchecked declarations and cannot promote them to checked package dates', () => {
  const values = [candidate('Milk')];
  const plan = prepareReceiptEstimateBatch(values, '2026-10-19', '2026-10-19', { 'line-0': 'milk-refrigerated' });
  const applied = applyReceiptEstimateBatch(values, plan, '2026-10-19');
  assert.equal(applied[0].packageDateReview.kind, 'unchecked'); assert.equal(applied[0].reviewed, false);
  const saved = saveReceiptCandidate(applied[0], receiptExpiryDraft(applied[0]));
  assert.equal(saved.expirySelection.packageDate, null); assert.equal(saved.packageDateReview.kind, 'unchecked');
});
test('durable restart retains printed/manual/estimated provenance without local declarations or OCR', async () => {
  const parsed = parseReceiptCandidates(['Biscuits Rs. 30.00', 'Milk Rs. 60.00', 'Rice Rs. 100.00']).candidates;
  const rows = parsed.map((row, i) => saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'pack' },
    packageDateReview: i === 0 ? confirmPrintedReceiptDate(row.draft.name, printed.packageDate) : { kind: i === 1 ? 'unavailable' : 'unchecked' } },
    i === 0 ? printed : i === 1 ? manual : estimated));
  const input = { ...reviewedReceiptInput(rows), confirmed: true }, values = new Map();
  const io = { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } };
  const store = createReceiptImportStorage(io, 'package-review');
  await store.save(input, 'package-review-retry-123456', true);
  const restored = await createReceiptImportStorage(io, 'package-review').load();
  assert.deepEqual(restored.input, input);
  assert.deepEqual(restored.input.items.map(row => [row.item.expirySelection.packageDate, row.item.expirySelection.userDate, row.item.expirySelection.preset?.days ?? null]),
    [['2026-11-30', null, null], [null, '2026-11-25', null], [null, null, 7]]);
  assert.doesNotMatch(JSON.stringify(restored.input), /packageDateReview|unavailable|unchecked|original/);
  assert.throws(() => cleanReceiptInput({ items: [{ ...input.items[0], item: { ...input.items[0].item, packageDateReview: { kind: 'printed' } } }] }));
  await store.clear(); assert.equal(values.size, 0);
});
test('legacy confirmed imports remain valid without requiring new local-only declaration metadata', () => {
  const row = candidate(); delete row.packageDateReview;
  const saved = saveReceiptCandidate(row, printed);
  assert.equal(reviewedReceiptInput([saved]).items[0].item.expirySelection.packageDate, '2026-11-30');
});
