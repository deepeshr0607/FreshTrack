import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === './pantry' && context.parentURL?.endsWith('/lib/barcode.ts') ? './pantry.ts' : specifier, context);
} });
const { MOCK_BARCODE_PRODUCTS, barcodeLookup, newBarcodeCandidate, dateAfter, barcodeDuplicates, prepareBarcodeImport } = await import('../lib/barcode.ts');
import { pantryReducer } from '../lib/pantry.ts';
const ready = (index = 0, id = 'one', source = 'PRESET_ESTIMATE') => {
  const row = newBarcodeCandidate(MOCK_BARCODE_PRODUCTS[index], id);
  row.draft.expiresOn = '2026-12-31'; row.expirySource = source; row.confirmed = true;
  return row;
};
test('synthetic lookup only recognizes sample codes and calendar estimates respect boundaries', () => {
  assert.equal(barcodeLookup(' 000000000001 ').name, 'Chobani Greek Yogurt (32oz)');
  assert.equal(barcodeLookup('999999999999'), null);
  assert.equal(dateAfter(2, new Date(2026, 11, 30)), '2027-01-01');
  const row = newBarcodeCandidate(MOCK_BARCODE_PRODUCTS[0], 'q');
  assert.equal(row.confirmed, false); assert.equal(row.draft.expiresOn, '');
});
test('missing dates, invalid edits and unconfirmed options cannot import a partial queue', () => {
  const rows = [ready(), newBarcodeCandidate(MOCK_BARCODE_PRODUCTS[1], 'two')];
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /valid expiry/);
  rows[1].draft.expiresOn = '2026-12-31';
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /Confirm an expiry option/);
  rows[1].confirmed = true; rows[1].draft.quantity = '0';
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /greater than zero/);
  rows[1].draft.quantity = '1'; rows[1].draft.expiresOn = '2026-02-30';
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /valid expiry/);
});
test('source, barcode, fractional quantities and dates survive atomic insertion and replay is blocked', () => {
  const rows = [ready(0, 'stamp', 'PACKAGE_DATE'), ready(1, 'manual', 'USER_ENTERED'), ready(2, 'estimate')];
  rows[1].draft.quantity = '0,5'; rows[1].draft.price = '';
  const result = prepareBarcodeImport(rows, [], 'batch');
  assert.equal(result.error, null);
  assert.deepEqual(result.items.map((item) => item.expirySource), ['PACKAGE_DATE', 'USER_ENTERED', 'PRESET_ESTIMATE']);
  assert.ok(result.items.every((item) => item.source === 'BARCODE' && item.barcode));
  assert.match(result.items[0].note, /simulated/);
  assert.equal(result.items[1].quantity, 0.5); assert.equal(result.items[1].price, 0);
  const inventory = pantryReducer([], { type: 'barcode', items: result.items });
  assert.equal(inventory.length, 3);
  assert.strictEqual(pantryReducer(inventory, { type: 'barcode', items: result.items }), inventory);
  const invalid = { ...result.items[0], id: 'bad', price: -1 };
  assert.strictEqual(pantryReducer(inventory, { type: 'barcode', items: [invalid] }), inventory);
});
test('barcode duplicates still match after pantry renaming; skip/separate never alter previous purchases', () => {
  const first = prepareBarcodeImport([ready()], [], 'original').items[0];
  const existing = { ...first, name: 'Renamed yogurt' };
  const next = ready(0, 'next');
  assert.equal(barcodeDuplicates(next, [existing]).length, 1);
  assert.match(prepareBarcodeImport([next], [existing], 'next').error, /Choose Skip/);
  next.duplicateChoice = 'skip';
  assert.match(prepareBarcodeImport([next], [existing], 'next').error, /All items are skipped/);
  next.duplicateChoice = 'separate';
  const result = prepareBarcodeImport([next], [existing], 'next');
  const inventory = pantryReducer([existing], { type: 'barcode', items: result.items });
  assert.equal(inventory.length, 2); assert.strictEqual(inventory[1], existing);
  assert.equal(barcodeDuplicates(next, [{ ...existing, status: 'CONSUMED' }]).length, 0);
});
test('duplicates within queue require review and empty/repeated IDs are rejected', () => {
  const rows = [ready(0, 'one'), ready(0, 'two')];
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /Choose Skip/);
  rows[1].duplicateChoice = 'skip'; assert.equal(prepareBarcodeImport(rows, [], 'batch').items.length, 1);
  rows[1].duplicateChoice = 'separate'; rows[1].id = rows[0].id;
  assert.match(prepareBarcodeImport(rows, [], 'batch').error, /Repeated queue IDs/);
  assert.match(prepareBarcodeImport([], [], 'empty').error, /Scan an item/);
});
