import type { PantryItemDto } from '../types/api';
import type { OverdueSnapshot } from './overdueReview';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';
export function reconciliationSearch(rows: PantryItemDto[], query: string) {
  const normalized = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  const search = normalized(query); return rows.filter(row => normalized(row.name).includes(search));
}
/** Freeze the exact reviewed versions; retries must never refresh or replace this request. */
export function reconciliationSelection(snapshot: OverdueSnapshot, ids: string[], pending: string[]) {
  if (snapshot.status !== 'ready') throw new NeonAuthError('REVIEW_UNAVAILABLE', 'Refresh the live expired-item review before confirming.');
  if (!ids.length || ids.length > 20 || new Set(ids).size !== ids.length) throw new NeonAuthError('REVIEW_SELECTION', 'Select between one and twenty different groceries.');
  return ids.map(id => {
    const item = snapshot.items.find(row => row.id === id);
    if (!item || item.status !== 'ACTIVE' || item.daysLeft >= 0 || pending.includes(id)) throw new NeonAuthError('REVIEW_CHANGED', 'A selected grocery changed or has a pending notification outcome. Refresh and review it.');
    return { ...item };
  });
}
