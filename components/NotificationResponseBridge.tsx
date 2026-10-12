import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/context/AuthContext';
import { notificationScope } from '@/features/notifications/nativeScheduler';
import { createNotificationIntentInbox } from '@/lib/notificationIntents';

export default function NotificationResponseBridge() {
  const { state } = useAuth();
  const navigation = useRootNavigationState();
  const inbox = useRef(createNotificationIntentInbox());
  const [revision, update] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const received = (response: Notifications.NotificationResponse) => {
      if (inbox.current.receive(response)) {
        // The in-memory inbox also deduplicates if a native response cannot be cleared.
        try { Notifications.clearLastNotificationResponse(); } catch { /* Confirmation still requires a fresh item and user approval. */ }
        update(value => value + 1);
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(received);
    try {
      const response = Notifications.getLastNotificationResponse(); if (response) received(response);
    } catch { /* Older/unsupported host runtimes can still deliver through the listener. */ }
    return () => { subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!navigation?.key || Platform.OS === 'web') return;
    const intent = inbox.current.take(state.status === 'authenticated' && state.user ? notificationScope(state.user.id) : null, state.checking, state.demo);
    if (!intent) return;
    router.push({ pathname: '/pantry/[id]', params: { id: intent.itemId,
      ...(intent.action !== 'view' ? { notificationAction: intent.action, notificationKey: String(revision) } : {}) } });
  }, [navigation?.key, revision, state.user?.id, state.status, state.checking, state.demo]);
  return null;
}
