// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { validReminderHour } from './reminderPreferences.ts';
// @ts-expect-error Explicit extensions support strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';

export const reminderPrefix = 'freshtrack.expiry.v1.';
export type ReminderItem = { id: string; expiresOn: string; status: string };
export type ExpiryReminder = { identifier: string; scope: string; itemId: string; daysBefore: number; at: number };
export type QueuedReminder = { identifier: string; scope?: string; at?: number };
export function bindExpiryCleanup(session: {
  getSnapshot(): { checking: boolean; status: string; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}, scheduler: { invalidate(): void; cancel(scopeToKeep?: string | null): Promise<void> }, scopeForId: (id: string) => string) {
  const changed = () => {
    const value = session.getSnapshot();
    if (value.checking) { scheduler.invalidate(); return; }
    // Keep generic alerts during transient offline auth errors; successful logout clears them.
    if (value.status === 'anonymous') void scheduler.cancel();
    else if (value.user) void scheduler.cancel(scopeForId(value.user.id));
  };
  changed(); return session.subscribe(changed);
}
/** Date-only expiry calendars use the chosen device-local hour, including native DST normalization. */
export function planExpiryReminders(scope: string, items: ReminderItem[], hour: string, now: number, limit = 60) {
  if (!validReminderHour(hour) || !Number.isFinite(now)) throw Error('INVALID_REMINDER_INPUT');
  const [hours, minutes] = hour.split(':').map(Number);
  const reminders: ExpiryReminder[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (item.status !== 'ACTIVE') continue;
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id) || seen.has(item.id)) throw Error('INVALID_REMINDER_INPUT');
    seen.add(item.id);
    const expiry = resolveExpiry({ packageDate: null, userDate: item.expiresOn, preset: null }).expiresOn;
    for (const daysBefore of [3, 1, 0]) {
      const calendar = new Date(`${expiry}T00:00:00Z`);
      calendar.setUTCDate(calendar.getUTCDate() - daysBefore);
      const date = new Date(0);
      date.setFullYear(calendar.getUTCFullYear(), calendar.getUTCMonth(), calendar.getUTCDate());
      date.setHours(hours!, minutes!, 0, 0);
      const at = date.getTime();
      if (at > now) reminders.push({ identifier: `${reminderPrefix}${item.id}.${daysBefore}`, scope, itemId: item.id, daysBefore, at });
    }
  }
  reminders.sort((a, b) => a.at - b.at || a.identifier.localeCompare(b.identifier));
  const bounded = Math.max(0, Math.min(60, Math.trunc(limit)));
  return { reminders: reminders.slice(0, bounded), omitted: Math.max(0, reminders.length - bounded) };
}

/** Native queue is the durable identifier ledger; never clear another project's notifications. */
export function createExpiryScheduler(io: {
  list(): Promise<QueuedReminder[]>; cancel(identifier: string): Promise<void>;
  schedule(reminder: ExpiryReminder): Promise<string>;
}, currentScope: () => string | null, now = Date.now) {
  let queue: Promise<unknown> = Promise.resolve(), revision = 0;
  let state = { scope: '', busy: false, count: 0, nextAt: null as number | null, message: 'Sync reminders to refresh the device schedule.' };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const run = <T>(task: () => Promise<T>) => { const result = queue.then(task); queue = result.catch(() => undefined); return result; };
  const owned = (row: QueuedReminder) => row.identifier.startsWith(reminderPrefix);
  const stats = (scope: string, rows: QueuedReminder[], message: string) => {
    const active = rows.filter(row => owned(row) && row.scope === scope && Number(row.at) > now());
    publish({ scope, count: active.length, nextAt: active.length ? Math.min(...active.map(row => row.at!)) : null, message });
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate() { revision++; },
    generation: () => revision,
    inspect(scope: string) { return run(async () => {
      if (currentScope() !== scope) return;
      try { const rows = await io.list(); if (currentScope() === scope) stats(scope, rows, 'Device schedule checked. Sync to apply current Pantry data.'); }
      catch { publish({ scope, message: 'Unable to read the reminder schedule. Retry Sync Expiry Reminders.' }); }
    }); },
    cancel(scopeToKeep: string | null = null, ids?: string[]) {
      revision++;
      return run(async () => {
        publish({ busy: true });
        try {
          const rows = await io.list();
          for (const row of rows) if (owned(row) && (ids ? ids.some(id => row.identifier.startsWith(`${reminderPrefix}${id}.`)) : row.scope !== scopeToKeep)) await io.cancel(row.identifier);
          const remaining = await io.list();
          stats(currentScope() || '', remaining, 'Schedule changed. Sync reminders to apply current Pantry data.');
        } catch { publish({ message: 'Reminder cancellation failed. Retry Sync Expiry Reminders before relying on the schedule.' }); }
        finally { publish({ busy: false }); }
      });
    },
    sync(scope: string, items: ReminderItem[], hour: string, enabled: boolean, expectedRevision = revision) {
      if (expectedRevision !== revision) {
        if (currentScope() === scope) publish({ message: 'Session, preferences or Pantry changed. Retry Sync Expiry Reminders.' });
        return Promise.resolve();
      }
      const version = ++revision;
      // Validate the full calendar before touching the existing native queue.
      const complete = planExpiryReminders(scope, items, hour, now());
      return run(async () => {
        const valid = () => version === revision && currentScope() === scope;
        if (!valid()) return;
        publish({ scope, busy: true });
        try {
          const rows = await io.list(); if (!valid()) return;
          const capacity = Math.max(0, 60 - rows.filter(row => !owned(row)).length);
          const desired = enabled ? complete.reminders.slice(0, capacity) : [];
          for (const row of rows.filter(owned)) {
            if (!valid()) return;
            const match = desired.find(reminder => reminder.identifier === row.identifier && reminder.scope === row.scope && reminder.at === row.at);
            if (!match) await io.cancel(row.identifier);
          }
          for (const reminder of desired) {
            if (!valid()) return;
            if (reminder.at <= now()) continue;
            if (!rows.some(row => row.identifier === reminder.identifier && row.scope === scope && row.at === reminder.at)) {
              const identifier = await io.schedule(reminder);
              if (!valid() || identifier !== reminder.identifier) { await io.cancel(identifier); if (!valid()) return; throw Error('SCHEDULE_MISMATCH'); }
            }
          }
          const confirmed = await io.list(); if (!valid()) return;
          const expected = desired.filter(reminder => reminder.at > now());
          if (expected.some(reminder => !confirmed.some(row => row.identifier === reminder.identifier && row.scope === scope && row.at === reminder.at))) throw Error('SCHEDULE_INCOMPLETE');
          const omitted = enabled ? complete.omitted + complete.reminders.length - desired.length : 0;
          stats(scope, confirmed, !enabled ? 'Reminders are Off. FreshTrack alerts cancelled.'
            : omitted ? `Closest ${expected.length} alerts scheduled; ${omitted} later alerts deferred. Sync again as dates advance.`
            : `${expected.length} future expiry alerts scheduled. Past milestones skipped.`);
        } catch { publish({ scope, message: 'Unable to finish scheduling. Some alerts may have changed; retry Sync Expiry Reminders.' }); }
        finally { publish({ busy: false }); }
      });
    },
  };
}
