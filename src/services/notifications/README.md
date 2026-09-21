# services/notifications

Push-notification device-token registration and tap-to-navigate handling.

- `push-token.ts` -- `useRegisterPushToken(status)`, called once from
  `app/(protected)/_layout.tsx`, is the real "for every login" hook: it
  requests notification permission, obtains a real Expo push token, and
  registers it with the backend (`POST /notifications/device-token`) for
  every role that reaches the protected area. It also wires
  `addNotificationResponseReceivedListener` so tapping a delivered
  notification navigates to the real `deepLink` the backend attaches to it.
- The session-lifecycle half (calling the backend, remembering the token so
  sign-out can unregister it) lives in `src/lib/auth.ts`
  (`registerPushToken`, and `logout()`'s own best-effort unregister) --
  intentionally not duplicated here.

Requires a real development or production build to actually receive a push;
Expo Go has not supported remote push notifications since SDK 53 (permission
prompts and local behavior still work there, but `getExpoPushTokenAsync`
degrades to a no-op via this module's own honest `null` return, never a
crash).
