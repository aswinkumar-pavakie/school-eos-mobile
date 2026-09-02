# Security

## Storage boundaries

| Data                                | Where                                             | Never                                            |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Access/refresh tokens               | `src/services/storage/secure` (Keychain/Keystore) | `AsyncStorage`                                   |
| Offline queue, any bulk local cache | `src/services/storage/database` (SQLite)          | Secure storage (size-limited, not for bulk data) |
| Install identifier (non-credential) | `AsyncStorage`, plain                             | Secure storage (it's not a secret)               |

Logout (`useSessionStore().signOut`) clears secure storage, clears the
signed-out account's offline queue, and resets the local SQLite database -
never leaves a prior account's data reachable after switching accounts.

## Device identity vs. device credentials

`src/services/device/identity/installationId.ts` generates a random
identifier for _this app install_, for idempotency/telemetry correlation
only - holding it grants no privilege. This is distinct from the _privileged
device credentials_ the HLD describes for biometric terminals, NFC
personalisation stations, and canteen/bus terminals; this consumer app never
holds those, and must not be extended to.

## Secrets

This app holds none. The Supabase `service_role` key, card master keys, and
any provider signing secrets are server-side only. `EXPO_PUBLIC_*`
environment variables are bundled into the client and readable by anyone
with the app installed - treat them as public configuration, never secrets
(see `.env.example`). `scripts/check-security.js` fails CI on a
`service_role` string, a private-key block, an obvious payment-gateway
secret pattern, or an `EXPO_PUBLIC_*` variable whose name suggests it holds
a secret.

## Logging

`src/services/telemetry/logging/logger.ts` redacts a fixed set of key names
(`password`, `token`, `pin`, `otp`, `secret`, ...) before emitting a log
line. Never log a raw API error body, a raw payload, or health/clinical
detail - see `src/components/ui/ErrorState.tsx`'s note on user-safe messages.

## Deep links / notifications

Notification payloads are untrusted input. `src/services/notifications/routing/notificationRouter.ts`
resolves them through a Zod-validated allowlist of known notification
`type`s only - never construct a route directly from a payload field.

## PIN gate (Parent app)

Per the source docs, wallet, fees, child leave, and complaints require a PIN
re-entry even within an authenticated session - build this as a shared gate
component in `src/features/wallet` or a cross-feature location once more
than one feature needs it, not duplicated per screen.
