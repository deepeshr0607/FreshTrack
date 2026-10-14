import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconciliationSearch, reconciliationSelection } from '../lib/reconciliation.ts';
const row = (n = 1) => ({ id: `11111111-1111-1111-1111-${String(n).padStart(12, '0')}`, name: `Reconcile Test ${n}`,
  status: 'ACTIVE', daysLeft: -1, expiresOn: '2026-10-13', quantity: '0.5', totalCostMinor: 6050, updatedAt: '2026-10-14T08:00:00.000Z' });
const snapshot = (items = [row()]) => ({ status: 'ready', items, checkedAt: 1, householdDay: '2026-10-14', message: '' });
test('review search composes case/space and Unicode normalization without treating text as a pattern', () => {
  const rows = [row(), { ...row(2), name: 'Café apple' }, { ...row(3), name: 'Rice [bag]' }];
  assert.deepEqual(reconciliationSearch(rows, ' rEcOnCiLe   tEsT ').map(item => item.id), [row().id]);
  assert.equal(reconciliationSearch(rows, 'cafe\u0301').length, 1);
  assert.equal(reconciliationSearch(rows, '[bag]').length, 1); assert.equal(reconciliationSearch(rows, '.*').length, 0);
});
test('single and bulk reviews freeze exact versions, quantities and known/unknown values without mutations', () => {
  const first = row(), second = { ...row(2), totalCostMinor: null };
  const view = snapshot([first, second]), saved = reconciliationSelection(view, [first.id, second.id], []);
  first.updatedAt = '2026-10-14T09:00:00.000Z'; first.quantity = '2'; second.totalCostMinor = 1000;
  assert.equal(saved[0].updatedAt, '2026-10-14T08:00:00.000Z'); assert.equal(saved[0].quantity, '0.5');
  assert.equal(saved[0].totalCostMinor, 6050); assert.equal(saved[1].totalCostMinor, null);
  assert.ok(saved.every(item => item.status === 'ACTIVE'));
});
test('loading/error/idle snapshots cannot authorize a reconciliation write', () => {
  for (const status of ['idle', 'loading', 'error']) assert.throws(() => reconciliationSelection({ ...snapshot(), status }, [row().id], []), error => error.code === 'REVIEW_UNAVAILABLE');
});
test('one queued notification in a selected group rejects the entire review instead of silently skipping it', () => {
  const rows = [row(), row(2)];
  assert.throws(() => reconciliationSelection(snapshot(rows), rows.map(item => item.id), [rows[1].id]), error => error.code === 'REVIEW_CHANGED');
  assert.equal(reconciliationSelection(snapshot(rows), [rows[0].id], [rows[1].id]).length, 1);
});
test('zero, duplicate and over-cap selection cannot prepare a batch; twenty is accepted', () => {
  const rows = Array.from({ length: 21 }, (_, n) => row(n + 1));
  for (const ids of [[], [rows[0].id, rows[0].id], rows.map(item => item.id)]) assert.throws(() => reconciliationSelection(snapshot(rows), ids, []), error => error.code === 'REVIEW_SELECTION');
  assert.equal(reconciliationSelection(snapshot(rows), rows.slice(0, 20).map(item => item.id), []).length, 20);
});
test('missing, already-resolved, today and future entries cannot be reconciled as overdue', () => {
  assert.throws(() => reconciliationSelection(snapshot(), [row(9).id], []), error => error.code === 'REVIEW_CHANGED');
  for (const fields of [{ daysLeft: 0 }, { daysLeft: 1 }, { status: 'CONSUMED' }, { status: 'WASTED' }, { status: 'ASSUMED_CONSUMED' }]) {
    assert.throws(() => reconciliationSelection(snapshot([{ ...row(), ...fields }]), [row().id], []), error => error.code === 'REVIEW_CHANGED');
  }
});
