# Release / EAS

## Environments

Three build profiles in `eas.json`, matched by `app.config.ts`'s `APP_ENV`
switch: `development` (dev client, internal distribution),
`preview` (internal distribution, `preview` update channel),
`production` (`production` update channel, auto-incrementing build number).

## What's a placeholder right now

Nothing here should be treated as real until the company fills it in:

| Placeholder                                                                                   | File                                   | What to do                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `com.placeholder.schooleos` (iOS bundle ID / Android package)                                 | `app.config.ts`                        | Replace with the company's registered app identifier before any internal or store build. Changing this after a store submission is disruptive - decide it once, deliberately.  |
| `PLACEHOLDER-EAS-PROJECT-ID`                                                                  | `app.config.ts`                        | Run `eas init` in this repo; it writes the real project ID.                                                                                                                    |
| `PLACEHOLDER_APPLE_ID` / `PLACEHOLDER_APP_STORE_CONNECT_APP_ID` / `PLACEHOLDER_APPLE_TEAM_ID` | `eas.json` `submit.production.ios`     | Fill in once there's an App Store Connect record for this app.                                                                                                                 |
| `PLACEHOLDER_PATH_TO_SERVICE_ACCOUNT_JSON`                                                    | `eas.json` `submit.production.android` | Fill in once there's a Play Console service account. Never commit the actual JSON key file - keep it outside the repo and reference its path, or use EAS's credential storage. |

## Runtime version / OTA

Not yet configured - decide `runtimeVersion` policy (e.g. `appVersion` vs. a
custom policy) before the first OTA-eligible release, since it determines
which native builds a given JS update is compatible with. Document the
decision here once made; do not guess it silently.

## Commands (once placeholders above are filled in)

```bash
eas build --profile development --platform all
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform ios
eas submit --profile production --platform android
```
