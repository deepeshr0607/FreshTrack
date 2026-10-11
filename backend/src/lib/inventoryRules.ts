import type { PantryStatus } from '../../../types/api';
import { InvalidApiInput } from './api';

const DAY = 86_400_000;
/** Validate dates without Date's permissive rollover or server/device timezone. */
export function calendarDate(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) throw new InvalidApiInput('Invalid calendar date.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new InvalidApiInput('Invalid calendar date.');
  return value;
}

export function utcTimestamp(value: Date): string {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new InvalidApiInput('Invalid timestamp.');
  const timestamp = value.toISOString();
  if (!/^\d{4}-/.test(timestamp) || timestamp.startsWith('0000')) throw new InvalidApiInput('Unsupported timestamp year.');
  return timestamp;
}

/** Prisma @db.Date values must represent midnight UTC, never a local device instant. */
export function serializeCalendarDate(value: Date): string {
  const timestamp = utcTimestamp(value);
  if (!timestamp.endsWith('T00:00:00.000Z')) throw new InvalidApiInput('Expected a date-only database value.');
  return calendarDate(timestamp.slice(0, 10));
}

export function householdDate(now: Date, timezone: string): string {
  utcTimestamp(now);
  // Require a named IANA-style zone (or UTC), rather than an ambiguous numeric offset.
  if (typeof timezone !== 'string' || timezone.length > 64 || !/^(UTC|[A-Za-z_]+\/[A-Za-z0-9_+\-/]+)$/.test(timezone)) {
    throw new InvalidApiInput('Invalid household timezone.');
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (name: string) => parts.find(p => p.type === name)?.value;
    return calendarDate(`${part('year')?.padStart(4, '0')}-${part('month')}-${part('day')}`);
  } catch { throw new InvalidApiInput('Invalid household timezone or date.'); }
}

export function expiryState(expiresOn: string, timezone: string, now: Date) {
  const expiry = calendarDate(expiresOn), today = householdDate(now, timezone);
  const daysLeft = (Date.parse(`${expiry}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY;
  // Calendar-day display tiers match the prototype; this is not an exact 48-hour timer.
  const freshness = daysLeft < 0 ? 'expired' : daysLeft <= 1 ? 'critical' : daysLeft <= 6 ? 'caution' : 'fresh';
  return { daysLeft, freshness, overdue: daysLeft < 0 } as const;
}

export type StatusAction = 'consume' | 'waste' | 'assume' | 'restore';
/** Pure policy only: actual mutation and event append must share a transaction in Phase 4/5. */
export function planStatusTransition(current: PantryStatus, action: StatusAction) {
  const targets: Record<StatusAction, PantryStatus> = { consume: 'CONSUMED', waste: 'WASTED', assume: 'ASSUMED_CONSUMED', restore: 'ACTIVE' };
  if (!['ACTIVE', 'CONSUMED', 'WASTED', 'ASSUMED_CONSUMED'].includes(current) || !Object.hasOwn(targets, action)) {
    throw new InvalidApiInput('Invalid status action.');
  }
  const next = targets[action];
  if (current === next) return { previousStatus: current, newStatus: next, changed: false };
  if (current !== 'ACTIVE' && action !== 'restore' && !(current === 'ASSUMED_CONSUMED' && ['consume', 'waste'].includes(action))) {
    throw new InvalidApiInput('Restore the entry before changing a confirmed outcome.');
  }
  return { previousStatus: current, newStatus: next, changed: true };
}
