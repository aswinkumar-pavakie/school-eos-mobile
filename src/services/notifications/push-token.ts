// Push notifications -- the Expo-SDK-specific half. The session-lifecycle half
// (calling the backend, remembering the token so logout can clean it up) lives
// in src/lib/auth.ts (registerPushToken/its logout-time unregister); this file
// only ever talks to expo-notifications/expo-device/expo-constants and calls
// back into auth.ts, never the reverse.
//
// One real gap this closes: expo-notifications, expo-device, and expo-constants
// were already installed dependencies (see package.json) but nothing in the app
// ever imported them -- this was the "reserved, not implemented yet" module the
// README here already pointed at.
//
// IMPORTANT (native limitation, not a bug in this code): Expo Go has not
// supported remote push notifications since SDK 53 -- only a real development
// or production build (`eas build --profile development`, or a prebuilt native
// run) can obtain a real token and actually receive a push. In Expo Go this
// degrades to a silent no-op (registerForPushNotificationsAsync returns null),
// exactly like a simulator/emulator or a denied permission does below -- never
// a crash, since push registration is a background enhancement, not something
// any screen depends on to function.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerPushToken, type SessionStatus } from '@/lib/auth';

/** Foreground behavior: a notification that arrives while the app is already
 * open still shows as a banner and lands in the OS notification list, same as
 * a background-arrived one -- an "your request was approved" alert would
 * otherwise be silently swallowed just because the app happened to be open. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

type DevicePlatform = 'ANDROID' | 'IOS';

/** Resolves a real Expo push token for this exact device, or null for every
 * honest reason it can't (web, simulator/emulator, permission denied, no real
 * EAS project configured yet) -- never throws, since every caller treats "no
 * token" as "skip silently," not an error to surface to the user. */
export async function registerForPushNotificationsAsync(): Promise<{ token: string; platform: DevicePlatform } | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null; // simulators/emulators don't get real, deliverable tokens

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  // PLACEHOLDER-aware: app.config.ts's own EAS projectId is still a placeholder
  // until `eas init` is run (see that file's own comment) -- without a real
  // one, getExpoPushTokenAsync can't mint a real token, so skip rather than
  // let it throw.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || projectId.includes('PLACEHOLDER')) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' };
  } catch {
    return null;
  }
}

/** The one real "for every login" hook: fires once per genuine sign-in (the
 * effect's own [status] dependency means it re-fires on a fresh login after a
 * prior sign-out, but not on every re-render of an already-signed-in screen),
 * for every role -- registration itself carries no role check, matching the
 * backend route it calls. Also wires up tap-to-navigate: tapping a delivered
 * notification opens the same deepLink the backend already attaches to every
 * real notification row (see push-delivery.scheduler.ts). */
export function useRegisterPushToken(status: SessionStatus): void {
  const router = useRouter();
  const configuredRef = useRef(false);

  useEffect(() => {
    if (!configuredRef.current) {
      configureNotificationHandler();
      configuredRef.current = true;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deepLink;
      if (typeof deepLink === 'string' && deepLink.length > 0) {
        router.push(deepLink as never);
      }
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    let cancelled = false;

    (async () => {
      const result = await registerForPushNotificationsAsync();
      if (cancelled || !result) return;
      // Best-effort: a failed registration just means this device doesn't get
      // pushes yet, not something worth surfacing to the person signing in.
      await registerPushToken(result.token, result.platform).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);
}
