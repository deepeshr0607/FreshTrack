export type ReminderPermission = { allowed: boolean; canAskAgain: boolean; label: string };
export type ReminderChoice = { enabled: boolean; hour: string };
const defaults: ReminderChoice = { enabled: false, hour: '17:00' };
export const validReminderHour = (hour: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(hour);
export function readReminderChoice(raw: string | null, scope: string): ReminderChoice {
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version === 1 && value.scope === scope && typeof value.enabled === 'boolean' && typeof value.hour === 'string' && validReminderHour(value.hour)) {
      return { enabled: value.enabled, hour: value.hour };
    }
  } catch { /* Invalid or other-account data never enables reminders. */ }
  return { ...defaults };
}

/** Device/account preference only. No scheduling, API credentials or authentication is stored. */
export function createReminderPreferences(scope: string, io: {
  read(): Promise<string | null>; write(value: string): Promise<void>;
  permission(): Promise<ReminderPermission>; request(): Promise<ReminderPermission>;
}, active: () => boolean) {
  let state = { ...defaults, permission: { allowed: false, canAskAgain: false, label: 'Checking permission' },
    ready: false, busy: false, message: '' };
  const listeners = new Set<() => void>();
  const current = active;
  const publish = (patch: Partial<typeof state>) => {
    if (!current()) return;
    state = { ...state, ...patch }; listeners.forEach(listener => listener());
  };
  const run = async (operation: () => Promise<void>) => {
    if (!current() || state.busy) return;
    publish({ busy: true, message: '' });
    try { await operation(); }
    catch { publish({ message: 'Unable to update reminder preferences. Please retry.' }); }
    finally {
      // A temporary session check must not leave the controller permanently busy.
      state = { ...state, busy: false };
      if (current()) listeners.forEach(listener => listener());
    }
  };
  const save = async (choice: ReminderChoice) => {
    if (!current()) return;
    await io.write(JSON.stringify({ version: 1, scope, ...choice }));
    publish({ ...choice, message: 'Reminder preference saved on this device. Reminders refresh automatically when your session is verified.' });
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh: () => run(async () => {
      const [raw, permission] = await Promise.all([io.read(), io.permission()]);
      publish({ ...readReminderChoice(raw, scope), permission, ready: true });
    }),
    enable: () => run(async () => {
      if (!state.ready) return;
      let permission = await io.permission();
      if (!current()) return;
      if (!permission.allowed && permission.canAskAgain) permission = await io.request();
      if (!current()) return;
      publish({ permission });
      if (!permission.allowed) { publish({ message: permission.canAskAgain
        ? 'Notifications were not allowed. You can try again when ready.'
        : 'Notifications are blocked. Open device settings to allow them, then return and enable reminders.' }); return; }
      await save({ enabled: true, hour: state.hour });
    }),
    disable: () => run(async () => { if (state.ready) await save({ enabled: false, hour: state.hour }); }),
    saveHour: (hour: string) => run(async () => {
      if (!state.ready) return;
      if (!validReminderHour(hour)) { publish({ message: 'Enter a valid 24-hour time such as 17:00.' }); return; }
      await save({ enabled: state.enabled, hour });
    }),
  };
}
