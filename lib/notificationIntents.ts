// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { reminderPrefix } from './expiryReminders.ts';
export const expiryActionCategory = 'FreshTrackExpiryActionsV1';
export const consumeNotificationAction = 'FRESHTRACK_CONSUMED';
export const wasteNotificationAction = 'FRESHTRACK_WASTED';
export const defaultNotificationAction = 'expo.modules.notifications.actions.DEFAULT';
export type NotificationIntent = { itemId: string; scope: string; action: 'consume' | 'waste' | 'view'; fingerprint: string; receivedAt: number };
export function parseNotificationIntent(value: unknown, now: number): NotificationIntent | null {
  if (!value || typeof value !== 'object') return null;
  const response = value as { actionIdentifier?: unknown; notification?: { date?: unknown; request?: {
    identifier?: unknown; content?: { categoryIdentifier?: unknown; data?: Record<string, unknown> } } } };
  const request = response.notification?.request, data = request?.content?.data;
  const identifier = request?.identifier, date = response.notification?.date;
  if (typeof identifier !== 'string' || !identifier.startsWith(reminderPrefix) || !data ||
      typeof date !== 'number' || !Number.isFinite(date) || date < now - 30 * 86400000 || date > now + 60000) return null;
  const match = identifier.slice(reminderPrefix.length).match(/^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.(0|1|3)$/i);
  if (!match || data.itemId !== match[1] || data.daysBefore !== Number(match[2]) ||
      typeof data.scope !== 'string' || !data.scope || data.scope.length > 512 || !Number.isSafeInteger(data.at) || Number(data.at) <= 0) return null;
  const action = response.actionIdentifier === defaultNotificationAction ? 'view'
    : request?.content?.categoryIdentifier !== expiryActionCategory ? null
    : response.actionIdentifier === consumeNotificationAction ? 'consume'
    : response.actionIdentifier === wasteNotificationAction ? 'waste' : null;
  if (!action) return null;
  return { itemId: match[1], scope: data.scope, action, fingerprint: JSON.stringify([data.scope, identifier, response.actionIdentifier, date]), receivedAt: now };
}
/** Navigation intent only: no durable action queue, credentials or automatic Pantry mutation. */
export function createNotificationIntentInbox(now = Date.now) {
  let pending: NotificationIntent | null = null;
  const seen = new Set<string>();
  return {
    receive(response: unknown) {
      const intent = parseNotificationIntent(response, now());
      if (!intent || seen.has(intent.fingerprint)) return false;
      seen.add(intent.fingerprint); while (seen.size > 128) seen.delete(seen.values().next().value!);
      pending = intent; return true;
    },
    take(scope: string | null, checking: boolean, demo: boolean) {
      if (!pending) return null;
      if (now() - pending.receivedAt > 10 * 60000 || demo) { pending = null; return null; }
      if (checking || !scope) return null; // Wait for a real, verified login; private routes stay guarded.
      const intent = pending; pending = null;
      return intent.scope === scope ? intent : null;
    },
  };
}
