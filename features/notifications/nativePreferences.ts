import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { createReminderPreferences, type ReminderPermission } from '@/lib/reminderPreferences';

const key = 'freshtrack.reminder.preference.v1';
function interpret(value: Notifications.NotificationPermissionsStatus): ReminderPermission {
  const provisional = value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return { allowed: value.granted || provisional, canAskAgain: value.canAskAgain,
    label: provisional ? 'Allowed quietly' : value.granted ? 'Allowed' : value.canAskAgain ? 'Not allowed yet' : 'Blocked in device settings' };
}
export function nativeReminderPreferences(scope: string, active: () => boolean) {
  return createReminderPreferences(scope, {
    read: () => SecureStore.getItemAsync(key),
    write: value => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    permission: async () => interpret(await Notifications.getPermissionsAsync()),
    request: async () => {
      // Android 13 permission prompts require a channel to exist first.
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('expiry-reminders', {
        name: 'Expiry reminders', importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
      if (!active()) throw Error('SESSION_CHANGED');
      return interpret(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
    },
  }, active);
}
