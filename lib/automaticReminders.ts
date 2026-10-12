import type { ReminderItem } from './expiryReminders';
import type { ReminderChoice } from './reminderPreferences';

export function bindAutomaticReminderSession(session: {
  getSnapshot(): { checking: boolean; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}, automatic: { request(): Promise<void>; invalidate(): void }, eligible: (id: string) => boolean) {
  const changed = () => {
    const current = session.getSnapshot();
    if (!current.checking && current.user && eligible(current.user.id)) void automatic.request();
    else automatic.invalidate();
  };
  const stop = session.subscribe(changed); changed(); return stop;
}

/** Coalesce lifecycle signals; only the latest verified live read may change the OS queue. */
export function createAutomaticReminders(io: {
  active(): boolean; readChoice(): Promise<ReminderChoice>; readItems(): Promise<ReminderItem[]>;
  invalidate(): void; generation(): number;
  commit(items: ReminderItem[], choice: ReminderChoice, generation: number): Promise<void>;
  notice(message: string): void;
}) {
  let version = 0, pending = false, work: Promise<void> | null = null;
  const start = () => {
    if (work) return work;
    work = Promise.resolve().then(async () => {
      while (pending) {
        pending = false;
        if (!io.active()) continue;
        const current = version, generation = io.generation();
        const valid = () => current === version && io.active();
        try {
          io.notice('Refreshing expiry reminders automatically…');
          const choice = await io.readChoice(); if (!valid()) continue;
          // Off does not depend on network or a live Pantry snapshot.
          const items = choice.enabled ? await io.readItems() : []; if (!valid()) continue;
          const latest = await io.readChoice(); if (!valid()) continue;
          if (latest.enabled !== choice.enabled || latest.hour !== choice.hour) { version++; io.invalidate(); pending = true; continue; }
          await io.commit(items, latest, generation);
        } catch { if (valid()) io.notice('Automatic reminder refresh failed. Retry Sync Expiry Reminders when online.'); }
      }
    }).finally(() => { work = null; if (pending) void start(); });
    return work;
  };
  const request = () => { version++; io.invalidate(); pending = true; return start(); };
  return {
    request,
    flush: request,
    invalidate() { version++; pending = false; io.invalidate(); },
  };
}
