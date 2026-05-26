/**
 * lib/push-notifications.ts
 *
 * Expo Push Notification utilities:
 *  - registerPushToken()  — request permission, get token, save to DB
 *  - sendExpoPushBatch()  — send push to a list of Expo push tokens via HTTP
 *  - clearPushToken()     — remove token from DB on logout
 *
 * NOTE: Replace "YOUR_EAS_PROJECT_ID" in app.json with your actual EAS
 *       project ID (from expo.dev > your project > Project ID).
 *       Without it, push tokens cannot be obtained in production builds.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/* ── Notification handler (must be set at module level) ─────────────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

/* ── Token registration ─────────────────────────────────────────────────── */

/**
 * Requests push notification permission, retrieves the Expo push token,
 * and stores it in the current user's `profiles.push_token` column.
 *
 * Safe to call multiple times — idempotent upsert on the DB side.
 * Returns the token string, or null if permissions are denied / not a device.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators / web cannot receive push notifications
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MyAquaPulse',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0EA5E9',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // Get project ID from app config
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

  if (!projectId || projectId === 'YOUR_EAS_PROJECT_ID') {
    console.warn(
      '[PushNotifications] EAS projectId not configured in app.json.\n' +
      'Replace "YOUR_EAS_PROJECT_ID" with your real project ID from expo.dev.',
    );
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Persist to Supabase — RLS allows the user to update their own row
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
    }

    return token;
  } catch (err) {
    console.warn('[PushNotifications] Failed to get push token:', err);
    return null;
  }
}

/**
 * Removes the push token from DB when the user logs out.
 * This prevents stale tokens from receiving notifications.
 */
export async function clearPushToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', user.id);
    }
  } catch {
    // Ignore — best effort
  }
}

/* ── Expo Push API ──────────────────────────────────────────────────────── */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  to:    string;          // Expo push token
  title: string;
  body:  string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

/**
 * Sends push notifications to a list of Expo tokens in batches of 100.
 * Uses the Expo Push Notification API (no auth required for basic usage).
 *
 * Silently ignores errors per-message (DeviceNotRegistered, etc.).
 */
export async function sendExpoPushBatch(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;

  // Filter out invalid tokens
  const valid = messages.filter(
    (m) => typeof m.to === 'string' && m.to.startsWith('ExponentPushToken['),
  );
  if (!valid.length) return;

  // Send in batches of 100 (Expo API limit)
  const BATCH_SIZE = 100;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(batch),
      });
      if (!res.ok) {
        console.warn('[PushNotifications] Batch send failed:', res.status);
      }
    } catch (err) {
      console.warn('[PushNotifications] Batch send error:', err);
    }
  }
}
