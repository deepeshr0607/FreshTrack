import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// Node's strip-types runner needs explicit extension resolution; Expo resolves this normally.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === './pantry' && context.parentURL?.endsWith('/lib/receipt.ts') ? './pantry.ts' : specifier, context);
} });
const { newReceiptCandidates, prepareReceiptImport, receiptDuplicates } = await import('../lib/receipt.ts');
import { pantryReducer, createPantryItem } from '../lib/pantry.ts';

test('reference rows import with receipt provenance and estimated dates; replay is atomic', () => {
  const rows = newReceiptCandidates(new Date(2026, 9, 11));
  const result = prepareReceiptImport(rows, [], 'batch');
  assert.equal(result.error, null); assert.equal(result.items.length, 4);
  assert.equal(result.items[0].expiresOn, '2026-10-16');
  assert.equal(result.items.reduce((sum, row) => sum + row.price, 0).toFixed(2), '16.16');
  assert.ok(result.items.every((item) => item.source === 'RECEIPT' && item.expirySource === 'PRESET_ESTIMATE'));
  const inventory = pantryReducer([], { type: 'receipt', items: result.items });
  assert.equal(inventory.length, 4);
  assert.strictEqual(pantryReducer(inventory, { type: 'receipt', items: result.items }), inventory);
});
test('duplicates require an explicit choice and never merge or consume existing inventory', () => {
  const rows = newReceiptCandidates();
  const existing = createPantryItem('existing', rows[0].draft);
  assert.equal(receiptDuplicates(rows[0], [existing]).length, 1);
  assert.match(prepareReceiptImport(rows, [existing], 'batch').error, /Choose Skip/);
  rows[0].duplicateChoice = 'skip';
  assert.equal(prepareReceiptImport(rows, [existing], 'batch').items.length, 3);
  rows[0].duplicateChoice = 'separate';
  const result = prepareReceiptImport(rows, [existing], 'batch');
  const updated = pantryReducer([existing], { type: 'receipt', items: result.items });
  assert.equal(updated.length, 5); assert.strictEqual(updated.at(-1), existing);
  assert.equal(existing.status, 'ACTIVE');
});
test('selection and edited values are honored; invalid entries cannot partially import', () => {
  const rows = newReceiptCandidates(); rows[1].selected = false;
  rows[0].draft = { ...rows[0].draft, quantity: '0.5', price: '2,50', expiresOn: '2026-12-31' };
  const result = prepareReceiptImport(rows, [], 'edited');
  assert.equal(result.items.length, 3); assert.equal(result.items[0].quantity, 0.5);
  assert.equal(result.items[0].price, 2.5); assert.equal(result.items[0].expirySource, 'USER_ENTERED');
  rows[2].draft.expiresOn = '2026-02-30';
  assert.match(prepareReceiptImport(rows, [], 'bad').error, /valid expiry date/);
  const invalid = { ...result.items[0], quantity: 0 };
  const inventory = [];
  assert.strictEqual(pantryReducer(inventory, { type: 'receipt', items: [result.items[1], invalid] }), inventory);
});
test('duplicates within one receipt and no selected/all skipped/repeated IDs cannot silently import', () => {
  const rows = newReceiptCandidates(); rows[1].draft.name = ' ORGANIC baby spinach ';
  assert.match(prepareReceiptImport(rows, [], 'batch').error, /Choose Skip/);
  rows[1].duplicateChoice = 'skip'; assert.equal(prepareReceiptImport(rows, [], 'batch').items.length, 3);
  rows.forEach((row) => { row.selected = false; });
  assert.match(prepareReceiptImport(rows, [], 'batch').error, /Select at least/);
  rows.forEach((row) => { row.selected = true; row.duplicateChoice = 'skip'; });
  assert.match(prepareReceiptImport(rows, [], 'batch').error, /All selected/);
  rows.forEach((row) => { row.duplicateChoice = 'separate'; }); rows[1].id = rows[0].id;
  assert.match(prepareReceiptImport(rows, [], 'batch').error, /repeated candidate IDs/);
});
