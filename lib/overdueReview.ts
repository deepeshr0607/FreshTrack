import type { PantryItemDto } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';
export interface OverdueSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'error'; items: PantryItemDto[];
  checkedAt: number | null; householdDay: string | null; message: string;
}
/** Use server-calculated household days, not the phone's timezone or freshness filter. */
export function overdueItems(rows: PantryItemDto[]) {
  if (!Array.isArray(rows) || rows.some(row => !row || !['ACTIVE', 'CONSUMED', 'WASTED', 'ASSUMED_CONSUMED'].includes(row.status))) throw Error('INVALID_OVERDUE_SNAPSHOT');
  const active = rows.filter(row => row.status === 'ACTIVE');
  let householdDay: string | null = null;
  const ids = new Set<string>();
  for (const row of active) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.id) || ids.has(row.id.toLowerCase()) || !Number.isInteger(row.daysLeft)) throw Error('INVALID_OVERDUE_SNAPSHOT');
    ids.add(row.id.toLowerCase());
    const expiry = resolveExpiry({ packageDate: null, userDate: row.expiresOn, preset: null }).expiresOn;
    const day = new Date(`${expiry}T00:00:00Z`); day.setUTCDate(day.getUTCDate() - row.daysLeft);
    if (!Number.isFinite(day.getTime()) || day.getUTCFullYear() < 1 || day.getUTCFullYear() > 9999) throw Error('INVALID_OVERDUE_SNAPSHOT');
    const current = day.toISOString().slice(0, 10);
    if (householdDay && householdDay !== current) throw Error('PANTRY_DAY_CHANGED');
    householdDay = current;
  }
  return { householdDay, items: active.filter(row => row.daysLeft < 0).map(row => ({ ...row }))
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id)) };
}
/** Read-only, coalesced live discovery. Never write an outcome or use cached rows. */
export function createOverdueReview(io: { active(): boolean; read(): Promise<PantryItemDto[]> }, now = Date.now) {
  let snapshot: OverdueSnapshot = { status: 'idle', items: [], checkedAt: null, householdDay: null, message: '' };
  let version = 0, pending = false, work: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (value: OverdueSnapshot) => { snapshot = value; listeners.forEach(listener => listener()); };
  const empty = (status: OverdueSnapshot['status'], message = ''): OverdueSnapshot => ({ status, message, items: [], checkedAt: null, householdDay: null });
  const start = (): Promise<void> => {
    if (work) return work;
    work = Promise.resolve().then(async () => {
      while (pending) {
        pending = false; if (!io.active()) continue;
        const revision = version, valid = () => revision === version && io.active();
        try {
          const rows = await io.read(); if (!valid()) continue;
          const result = overdueItems(rows);
          publish({ ...result, status: 'ready', checkedAt: now(), message: 'Expired groceries await your Used/Wasted confirmation.' });
        } catch { if (valid()) publish(empty('error', 'Overdue check unavailable. Refresh online to retry; no outcomes were changed.')); }
      }
    }).finally(() => { work = null; if (pending) void start(); });
    return work;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    request() {
      version++;
      if (!io.active()) { pending = false; publish(empty('idle', 'Verify your account and leave the cached-view test before checking live overdue items.')); return work || Promise.resolve(); }
      pending = true; publish(empty('loading', 'Checking live Pantry for overdue groceries…')); return start();
    },
    invalidate() { version++; pending = false; publish(empty('idle')); },
  };
}
