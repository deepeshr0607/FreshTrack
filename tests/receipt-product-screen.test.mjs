import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptReviewHarness } from './helpers/render-receipt-review.mjs';

/** Actual product TSX/cards and pure parsing rules; native hosts are injected.
 * These assertions cover guards/callbacks, not physical-device recognition.
 */
function screen(lines, readOnly = false) {
  const view = receiptReviewHarness({ lines, readOnly });
  const controls = view.controls.map(control => ({ ...control, label: control.accessibilityLabel ?? control.label ?? '' }));
  return { controls, markup: view.markup, prepared: view.prepared, add: controls.find(control => control.label.startsWith('Review & Add')) };
}

test('fresh-only receipt hides all package scan controls and Add prepares the valid haul', () => {
  const { controls, markup, add, prepared } = screen(['Watermelon Rs. 70.00', 'Spinach Rs. 30.00']);
  assert.equal(controls.filter(control => /scan.*expiry/i.test(control.label)).length, 0);
  assert.doesNotMatch(markup, /Check packaged expiry dates/);
  assert.match(markup, /No package scan needed/);
  assert.equal(add.disabled, false);
  add.onPress(); assert.equal(prepared.length, 1);
  assert.deepEqual(prepared[0].items.map(row => row.item.name), ['Watermelon', 'Spinach']);
  assert.ok(prepared[0].items.every(row => row.item.expirySelection.preset));
});

test('mixed receipt offers each packaged product directly and Add guides incomplete review without sending', () => {
  const { controls, markup, add, prepared } = screen(['Watermelon Rs. 70.00', 'Biscuits Rs. 20.00', 'Milk Rs. 60.00']);
  const labels = controls.map(control => control.label);
  assert.ok(labels.includes('Scan expiry for Biscuits')); assert.ok(labels.includes('Scan expiry for Milk'));
  assert.ok(!labels.some(label => /scan.*watermelon/i.test(label)));
  assert.match(markup, /Scan any item’s expiry tag/);
  assert.equal(add.disabled, false); // Unresolved dates must produce guidance, not a dead grey button.
  add.onPress(); assert.equal(prepared.length, 0); // Still no invalid server import.
});

test('unsupported fresh food is explained as a manual tracking date, not a packaged scan', () => {
  const { controls, markup, add, prepared } = screen(['Mango Rs. 40.00']);
  assert.equal(controls.filter(control => /scan.*expiry/i.test(control.label)).length, 0);
  assert.match(markup, /products need a date or correction/);
  assert.match(markup, /Fresh products do not need a package scan/);
  assert.equal(add.disabled, false); add.onPress(); assert.equal(prepared.length, 0);
});

test('read-only and empty receipts keep actual import guards and a clear explanation', () => {
  const cached = screen(['Watermelon Rs. 70.00'], true);
  assert.equal(cached.add.disabled, true); assert.match(cached.markup, /Pantry is read-only/);
  const empty = screen(['TOTAL 70.00']);
  assert.equal(empty.add.disabled, true); assert.match(empty.markup, /No products recognized/);
});
