import test from 'node:test';
import assert from 'node:assert/strict';
import { manualReceiptCandidate, saveReceiptCandidate, receiptExpiryDraft, receiptReviewSummary, receiptExpiryLabel } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, cleanReceiptInput, createReceiptImportStorage, createReceiptImportController } from '../lib/receiptImport.ts';
import { expiryPreset } from '../lib/pantryExpiry.ts';
const candidate = () => ({ ...manualReceiptCandidate('milk'), draft: { name: 'Receipt Expiry Milk', category: 'Dairy', quantity: '1', unit: 'l', price: '', expiresOn: '' } });
const estimate = { packageDate: '', userDate: '', baseDate: '2026-10-19', days: '7' };
function memory() { const values = new Map(); return { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } }; }
test('receipt estimates require explicit selection and retain chosen source through review and wire validation', () => {
  const row = candidate(); assert.equal(row.expirySelection, undefined); assert.equal(row.draft.expiresOn, '');
  assert.equal(expiryPreset(row.draft.name, 'DAIRY').days, 7);
  const saved = saveReceiptCandidate(row, estimate);
  assert.equal(saved.draft.expiresOn, '2026-10-26'); assert.equal(saved.selected, true); assert.equal(saved.reviewed, true);
  assert.deepEqual(receiptExpiryDraft(saved), estimate); assert.equal(receiptExpiryLabel({ expiresOn: saved.draft.expiresOn, expirySelection: saved.expirySelection }), 'Estimated: 2026-10-26');
  const body = reviewedReceiptInput([saved]); assert.deepEqual(body.items[0].item.expirySelection, { packageDate: null, userDate: null, preset: { baseDate: '2026-10-19', days: 7 } });
  assert.deepEqual(cleanReceiptInput(body), body); assert.equal(body.items[0].item.totalCostMinor, null);
});
test('package/manual precedence saves only the selected choice; editing never resurrects unused dates/estimates', () => {
  const printed = saveReceiptCandidate(candidate(), { ...estimate, packageDate: '2026-10-30', userDate: '2026-10-28' });
  assert.equal(printed.draft.expiresOn, '2026-10-30'); assert.deepEqual(printed.expirySelection, { packageDate: '2026-10-30', userDate: null, preset: null });
  assert.deepEqual(receiptExpiryDraft(printed), { packageDate: '2026-10-30', userDate: '', baseDate: '', days: '' });
  assert.throws(() => saveReceiptCandidate(printed, { ...receiptExpiryDraft(printed), packageDate: '' }));
  const manual = saveReceiptCandidate(printed, { ...receiptExpiryDraft(printed), packageDate: '', userDate: '2026-10-29' });
  assert.equal(manual.draft.expiresOn, '2026-10-29'); assert.deepEqual(manual.expirySelection, { packageDate: null, userDate: '2026-10-29', preset: null });
  assert.equal(receiptExpiryLabel({ expiresOn: manual.draft.expiresOn, expirySelection: manual.expirySelection }), 'User set: 2026-10-29');
  const override = saveReceiptCandidate(candidate(), { ...estimate, userDate: '2026-10-27' }); assert.equal(override.expirySelection.preset, null);
});
test('invalid durations/lower choices and mismatched dates cannot enter a reviewed or saved import', () => {
  for (const fields of [{ days: '0' }, { days: '366' }, { days: '1.5' }, { days: '1e2' }, { baseDate: '2026-02-30' }, { packageDate: '0000-01-01' }, { packageDate: '2026-10-30', userDate: '2026-02-30' }]) assert.throws(() => saveReceiptCandidate(candidate(), { ...estimate, ...fields }));
  const row = saveReceiptCandidate(candidate(), estimate);
  assert.ok(receiptReviewSummary([{ ...row, draft: { ...row.draft, expiresOn: '2026-10-27' } }]).error);
  const body = reviewedReceiptInput([row]);
  for (const item of [{ ...body.items[0].item, expiresOn: '2026-10-27' }, { ...body.items[0].item, expirySelection: { ...row.expirySelection, source: 'PACKAGE_DATE' } }, { ...body.items[0].item, expirySelection: { packageDate: null, userDate: null, preset: { baseDate: '2026-10-19', days: 0 } } }]) assert.throws(() => cleanReceiptInput({ items: [{ rowId: 'milk', item }] }));
  const legacy = { items: [{ rowId: 'old', item: { name: 'Legacy milk', category: 'DAIRY', quantity: '1', unit: 'l', expiresOn: '2026-10-25', totalCostMinor: 0 } }] };
  assert.deepEqual(cleanReceiptInput(legacy), legacy); // An existing date-only retry remains byte-for-byte canonical.
});
test('confirmed estimate survives paused restart and retries without a new base date', async () => {
  const storage = createReceiptImportStorage(memory(), 'expiry:account'); let calls = [];
  const body = reviewedReceiptInput([saveReceiptCandidate(candidate(), estimate)]);
  const make = () => createReceiptImportController({ storage, active: () => true,
    review: async input => ({ rows: input.items.map(row => ({ rowId: row.rowId, total: 0, matches: [], withinHaul: [] })) }),
    send: async (input, key) => { calls.push({ input: structuredClone(input), key }); throw Error('fixture offline'); },
  }, () => 'expiry-retry-key-12345');
  const first = make(); await first.restore(); await first.review(body); await first.confirm(true);
  const frozen = await storage.load(); assert.deepEqual(frozen.input.items[0].item.expirySelection, body.items[0].item.expirySelection);
  const restarted = make(); await restarted.restore(); assert.equal(calls.length, 0); await restarted.retry(true);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].input, frozen.input); assert.equal(calls[0].key, frozen.key);
  assert.deepEqual((await storage.load()).input, frozen.input);
});
