import test from 'node:test';
import assert from 'node:assert/strict';
import { RECEIPT_MAX_ITEMS } from '../lib/receiptLimits.ts';
import { parseReceiptCandidates, suggestReceiptNameOnlyItems, saveReceiptCandidate } from '../lib/receiptCandidates.ts';
import { reviewedReceiptInput, cleanReceiptInput, createReceiptImportStorage, createReceiptImportController, receiptImportStorageKey } from '../lib/receiptImport.ts';
import { NeonAuthError } from '../lib/neonAuth.ts';

const item = { name: 'Long Receipt Rice', category: 'OTHER', quantity: '1', unit: 'bag', expiresOn: '2026-11-30', totalCostMinor: 100 };
const input = { items: Array.from({ length: RECEIPT_MAX_ITEMS }, (_, index) => ({ rowId: `row-${String(index).padStart(2, '0')}`, item: { ...item, name: `Long Receipt Rice ${index}` } })) };
function memory() { const values = new Map(); return { values, io: { get: async key => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async key => { values.delete(key); } } }; }
const response = body => ({ receiptScanId: '11111111-1111-4111-8111-111111111111', replayed: true,
  items: body.items.map((row, index) => ({ ...row.item, id: `22222222-2222-4222-8222-${String(index).padStart(12, '0')}`, source: 'RECEIPT', currencyCode: 'INR', status: 'ACTIVE', expirySource: 'USER_ENTERED', daysLeft: 1, freshness: 'critical', createdAt: '2026-10-19T00:00:00.000Z', updatedAt: '2026-10-19T00:00:00.000Z' })) });

test('50 candidates preserve reviews across page-sized subsets and reject an oversized confirmed haul', () => {
  const parsed = parseReceiptCandidates(Array.from({ length: 55 }, (_, i) => `Long Receipt Rice ${i} Rs. ${i}.00`));
  const rows = suggestReceiptNameOnlyItems(parsed);
  assert.equal(rows.length, 50); assert.equal(parsed.remaining.length, 5);
  const reviewed = rows.map((row, index) => [0, 20, 49].includes(index) ? saveReceiptCandidate({ ...row, draft: { ...row.draft, quantity: '1', unit: 'bag' } },
    { packageDate: '', userDate: '2026-11-30', baseDate: '', days: '' }) : row);
  const payload = reviewedReceiptInput(reviewed);
  assert.equal(payload.items.length, 3); assert.deepEqual(payload.items.map(row => row.item.totalCostMinor).sort((a, b) => a - b), [0, 2000, 4900]);
  assert.equal(cleanReceiptInput(input).items.length, 50);
  assert.throws(() => cleanReceiptInput({ items: [...input.items, { rowId: 'extra', item }] }));
});
test('maximum Unicode/expiry retry exceeds the old chunk budget, restores exactly and clears every chunk', async () => {
  const mem = memory(), store = createReceiptImportStorage(mem.io, 'long-receipt-account');
  const body = { confirmed: true, items: input.items.map(row => ({ ...row, rowId: row.rowId.padEnd(40, 'x'), item: { ...row.item, name: '食'.repeat(120), unit: '袋'.repeat(32),
    quantity: '999999999.999', totalCostMinor: 2147483647, duplicateConfirmation: { confirmed: true, action: 'add_separately' },
    expirySelection: { packageDate: '2026-11-30', userDate: '2026-11-29', preset: { baseDate: '2026-10-19', days: 365 } } } })) };
  await store.save(body, 'long-receipt-key-123456', true);
  const meta = JSON.parse(mem.values.get(receiptImportStorageKey('long-receipt-account')));
  assert.ok(meta.count > 64); assert.ok([...mem.values.values()].every(value => Buffer.byteLength(value) <= 2000));
  const restored = await createReceiptImportStorage(mem.io, 'long-receipt-account').load();
  assert.deepEqual(restored.input, { ...cleanReceiptInput(body), confirmed: true }); assert.equal(restored.paused, true);
  assert.equal(await createReceiptImportStorage(mem.io, 'another-account').load(), null);
  await store.clear(); assert.equal(mem.values.size, 0);
});
test('legacy 20-item version-one retry manifest still restores without changing its key or payload', async () => {
  const mem = memory(), scope = 'legacy-account', prefix = receiptImportStorageKey(scope), key = 'legacy-receipt-key-123456';
  const body = { version: 1, scope, key, input: { confirmed: true, ...cleanReceiptInput({ items: input.items.slice(0, 20) }) } };
  const points = Array.from(JSON.stringify(body)); let count = 0;
  for (let i = 0; i < points.length; i += 400) mem.values.set(`${prefix}.${count++}`, points.slice(i, i + 400).join(''));
  assert.ok(count <= 64); mem.values.set(prefix, JSON.stringify({ version: 1, count, paused: true }));
  const restored = await createReceiptImportStorage(mem.io, scope).load();
  assert.equal(restored.key, key); assert.deepEqual(restored.input, body.input);
});
test('50-item lost-response restart retries the exact frozen intent explicitly and only once', async () => {
  const mem = memory(), storage = createReceiptImportStorage(mem.io, 'long-account'); let lose = true; const calls = [];
  const create = () => createReceiptImportController({ storage, active: () => true,
    review: async body => ({ rows: body.items.map(row => ({ rowId: row.rowId, matches: [], total: 0, withinHaul: [] })) }),
    send: async (body, key) => { calls.push(JSON.stringify({ body, key })); if (lose) throw new NeonAuthError('PANTRY_NETWORK', 'Lost response.'); return response(body); },
  }, () => 'long-receipt-key-123456');
  const first = create(); await first.restore(); await first.review(input); await first.confirm();
  assert.equal(first.getSnapshot().stage, 'pending'); assert.equal(calls.length, 1);
  const restored = create(); await restored.restore(); assert.equal(calls.length, 1); lose = false;
  await Promise.all([restored.retry(), restored.retry()]);
  assert.equal(restored.getSnapshot().stage, 'saved'); assert.equal(restored.getSnapshot().result.items.length, 50);
  assert.equal(calls.length, 2); assert.equal(calls[0], calls[1]); assert.equal(mem.values.size, 0);
});
