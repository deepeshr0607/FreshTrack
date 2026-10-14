// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';
export type PendingOutcome = { id: string; action: 'consume' | 'waste'; key: string; expectedUpdatedAt: string; blocked: boolean };
type Saved = { version: 1; scope: string; paused: boolean; entries: PendingOutcome[] };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function clean(row: PendingOutcome): PendingOutcome {
  if (!row || !uuid.test(row.id) || !['consume', 'waste'].includes(row.action) ||
      typeof row.key !== 'string' || !/^[a-zA-Z0-9_-]{10,100}$/.test(row.key) || typeof row.blocked !== 'boolean' ||
      typeof row.expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.expectedUpdatedAt) ||
      !Number.isFinite(Date.parse(row.expectedUpdatedAt)) || new Date(row.expectedUpdatedAt).toISOString() !== row.expectedUpdatedAt) throw Error('INVALID_OUTBOX');
  return { id: row.id, action: row.action, key: row.key, expectedUpdatedAt: row.expectedUpdatedAt, blocked: row.blocked };
}
/** Collision-free, SecureStore-safe account/branch key; no credential material is stored. */
export function notificationOutboxKey(scope: string) {
  return 'freshtrack.notification.outbox.v1.' + Array.from(scope).map(c => c.codePointAt(0)!.toString(16).padStart(6, '0')).join('');
}
/** Persist before send. Pending is separate from an acknowledged server outcome. */
export function createNotificationOutbox(scope: string, io: {
  read(): Promise<string | null>; write(raw: string): Promise<void>; active(): boolean;
  send(row: PendingOutcome): Promise<void>; acknowledged(id: string): Promise<void>;
}, allowDiagnostic = false) {
  if (!scope || scope.length > 512) throw Error('INVALID_SCOPE');
  let saved: Saved = { version: 1, scope, paused: false, entries: [] };
  let snapshot = { ready: false, entries: [] as PendingOutcome[], busy: false, paused: false, message: '' };
  const listeners = new Set<() => void>();
  const publish = (message = snapshot.message, busy = snapshot.busy) => {
    snapshot = { ready: loaded, entries: saved.entries.map(row => ({ ...row })), busy, paused: allowDiagnostic && saved.paused, message };
    listeners.forEach(listener => listener());
  };
  let loaded = false, serial: Promise<unknown> = Promise.resolve(), flight: Promise<void> | null = null, again = false;
  const run = <T>(task: () => Promise<T>) => { const result = serial.then(task); serial = result.catch(() => undefined); return result; };
  const load = async () => {
    if (loaded) return;
    const raw = await io.read();
    if (raw) {
      if (raw.length > 2000) throw Error('INVALID_OUTBOX');
      const value = JSON.parse(raw) as Saved;
      if (value.version !== 1 || value.scope !== scope || typeof value.paused !== 'boolean' || !Array.isArray(value.entries) || value.entries.length > 5) throw Error('INVALID_OUTBOX');
      const entries = value.entries.map(clean);
      if (new Set(entries.map(row => row.id)).size !== entries.length || new Set(entries.map(row => row.key)).size !== entries.length) throw Error('INVALID_OUTBOX');
      saved = { version: 1, scope, paused: allowDiagnostic && value.paused, entries };
    }
    loaded = true; publish('');
  };
  const commit = async (next: Saved) => {
    // ASCII escaping bounds actual bytes below historical native 2 KiB limits.
    const raw = JSON.stringify(next).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    if (raw.length > 2000) throw new NeonAuthError('OUTBOX_FULL', 'The saved action queue is full. Sync existing actions before confirming another.');
    await io.write(raw); saved = next; publish();
  };
  const storageFailure = () => publish('Saved notification actions could not be read or updated. Retry; no unsaved action was sent.', false);
  const flush = (): Promise<void> => {
    again = true; if (flight) return flight;
    flight = (async () => {
      let acknowledged = false;
      try {
        do {
          again = false; await run(load);
          if (!io.active() || (allowDiagnostic && saved.paused)) { publish(saved.paused ? 'Notification sync paused for the development test.' : '', false); return; }
          publish('', true);
          const pass = [...saved.entries];
          for (const row of pass) {
            if (!io.active() || (allowDiagnostic && saved.paused)) break;
            if (row.blocked || !saved.entries.some(entry => entry.key === row.key)) continue;
            try {
              await io.send({ ...row });
              if (!io.active()) break; // Keep the exact request for replay after verified recovery.
              await run(async () => { await commit({ ...saved, entries: saved.entries.filter(entry => entry.key !== row.key) }); });
              acknowledged = true;
              try { await io.acknowledged(row.id); } catch { publish('Outcome synced. Refresh Pantry to load its latest state.'); }
            } catch (error) {
              if (!io.active()) break;
              const code = error instanceof NeonAuthError ? error.code : '';
              if (['PANTRY_HTTP_400', 'PANTRY_HTTP_404', 'PANTRY_HTTP_409', 'PANTRY_CHANGED'].includes(code)) {
                await run(async () => { await commit({ ...saved, entries: saved.entries.map(entry => entry.key === row.key ? { ...entry, blocked: true } : entry) }); });
                publish('A saved action needs review. Open the item; it may have changed or become unavailable.');
              } else { publish('Action saved on this device. Retry online or reopen FreshTrack to sync.'); break; }
            }
          }
        } while (again && io.active());
        if (!saved.entries.length && acknowledged && !snapshot.message) publish('All confirmed notification actions are synced.');
      } catch { storageFailure(); }
      finally { publish(snapshot.message, false); flight = null; }
    })();
    return flight;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async restore() { try { await run(load); } catch { storageFailure(); } },
    async confirm(row: Omit<PendingOutcome, 'blocked'>) {
      if (!io.active()) throw new NeonAuthError('UNAUTHORIZED', 'Verify the same account before confirming this action.');
      const input = clean({ ...row, blocked: false });
      await run(async () => {
        try { await load(); } catch { throw new NeonAuthError('OUTBOX_STORAGE', 'Saved actions could not be read. Nothing was sent; retry before confirming.'); }
        if (!io.active()) throw new NeonAuthError('UNAUTHORIZED', 'Your session changed. Verify it before confirming again.');
        const prior = saved.entries.find(entry => entry.id === input.id);
        if (prior) throw new NeonAuthError('OUTBOX_PENDING', 'This item already has a saved action. Sync or review it before confirming again.');
        if (saved.entries.length >= 5) throw new NeonAuthError('OUTBOX_FULL', 'Five actions are already saved. Sync them before adding another.');
        try { await commit({ ...saved, entries: [...saved.entries, input] }); }
        catch (error) { if (error instanceof NeonAuthError) throw error; throw new NeonAuthError('OUTBOX_STORAGE', 'This action could not be saved on your device. Nothing was sent; retry.'); }
        publish('Action saved on this device; awaiting server confirmation.');
      });
      void flush();
    },
    flush,
    async discard(key: string) {
      await run(async () => {
        await load();
        if (!io.active() || snapshot.busy) throw new NeonAuthError('OUTBOX_BUSY', 'Wait for sync to finish and verify your session before forgetting a retry.');
        await commit({ ...saved, entries: saved.entries.filter(row => row.key !== key) });
        publish('Retry forgotten. Any outcome already saved online remains unchanged.');
      });
    },
    async pause(value: boolean) {
      if (!allowDiagnostic || !io.active()) return;
      await run(async () => { await load(); await commit({ ...saved, paused: value }); publish(value ? 'Notification sync paused for the development test.' : ''); });
      if (!value) await flush();
    },
  };
}
