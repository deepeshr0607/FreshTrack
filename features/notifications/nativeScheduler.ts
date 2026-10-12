import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { bindExpiryCleanup, createExpiryScheduler, reminderPrefix } from '@/lib/expiryReminders';
import type { AuthIdentity } from '@/lib/neonAuth';
import { expiryActionCategory, consumeNotificationAction, wasteNotificationAction } from '@/lib/notificationIntents';

let getScope: () => string | null = () => null;
export const notificationScope = (id: string) => JSON.stringify([process.env.EXPO_PUBLIC_NEON_AUTH_URL, id]);
export const nativeExpiryScheduler = Platform.OS === 'web' ? null : createExpiryScheduler({
  list: async () => (await Notifications.getAllScheduledNotificationsAsync()).map(row => ({ identifier: row.identifier,
    scope: typeof row.content.data?.scope === 'string' ? row.content.data.scope : undefined,
    at: typeof row.content.data?.at === 'number' ? row.content.data.at : undefined,
    actionVersion: row.content.categoryIdentifier === expiryActionCategory && row.content.data?.actionVersion === 1 ? 1 : undefined })),
  cancel: identifier => Notifications.cancelScheduledNotificationAsync(identifier),
  schedule: async reminder => {
    await Notifications.setNotificationCategoryAsync(expiryActionCategory, [
      { identifier: consumeNotificationAction, buttonTitle: 'Consumed', options: { opensAppToForeground: true, isAuthenticationRequired: true } },
      { identifier: wasteNotificationAction, buttonTitle: 'Wasted', options: { opensAppToForeground: true, isAuthenticationRequired: true, isDestructive: true } },
    ]);
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('expiry-reminders', {
      name: 'Expiry reminders', importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
    const trigger: Notifications.DateTriggerInput = { type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.at), channelId: 'expiry-reminders' };
    if (await Notifications.getNextTriggerDateAsync(trigger) === null) throw Error('INVALID_TRIGGER');
    if (getScope() !== reminder.scope || reminder.at <= Date.now()) throw Error('STALE_SCHEDULE');
    return Notifications.scheduleNotificationAsync({ identifier: reminder.identifier,
      content: { title: 'FreshTrack expiry reminder', body: reminder.daysBefore === 0
        ? 'A grocery reaches its expiry date today. Open Pantry to review it.'
        : `A grocery reaches its expiry date in ${reminder.daysBefore} ${reminder.daysBefore === 1 ? 'day' : 'days'}. Open Pantry to plan ahead.`,
        sound: 'default', categoryIdentifier: expiryActionCategory,
        data: { scope: reminder.scope, at: reminder.at, itemId: reminder.itemId, daysBefore: reminder.daysBefore, actionVersion: reminder.actionVersion } }, trigger });
  },
}, () => getScope());

export function bindExpiryScheduleSession(session: {
  getSnapshot(): { checking: boolean; status: string; user: AuthIdentity | null };
  subscribe(listener: () => void): () => void;
}) {
  const scheduler = nativeExpiryScheduler;
  if (!scheduler) return () => undefined;
  getScope = () => { const value = session.getSnapshot(); return !value.checking && value.user ? notificationScope(value.user.id) : null; };
  Notifications.setNotificationHandler({ handleNotification: async notification => {
    const show = notification.request.identifier.startsWith(reminderPrefix) && notification.request.content.data?.scope === getScope();
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  } });
  return bindExpiryCleanup(session, scheduler, notificationScope);
}
