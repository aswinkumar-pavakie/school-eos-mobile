## What changed and why

<!-- One or two sentences. Link the tracking issue if there is one. -->

## Type of change

- [ ] Feature implementation (inside `src/features/<name>/`)
- [ ] Shared infrastructure (`src/services`, `src/navigation`, `src/context`, `src/theme`)
- [ ] Dependency change
- [ ] API contract change / adapter update
- [ ] Architecture / tooling / CI change
- [ ] Documentation only

## Checklist

- [ ] `npm run validate` passes locally (typecheck, lint, format, tests, architecture check, security check)
- [ ] No feature imports another feature's internals (see `docs/architecture/overview.md`)
- [ ] No direct `fetch`/`axios` outside `src/services/api` - all network calls go through the shared client
- [ ] No direct `expo-secure-store` / `expo-sqlite` access outside `src/services/storage`
- [ ] Any new backend endpoint/DTO assumption is checked against the current API contract, or explicitly documented as an adapter/unknown in `docs/api/gaps.md`
- [ ] Any mutating endpoint call carries an `Idempotency-Key`, and retries (including offline sync) reuse the same key
- [ ] No secret, token, or `service_role` credential added to client code or committed `.env`
- [ ] Tests added/updated for new behavior (not padding - see `docs/testing/overview.md`)

## Dependency changes (if any)

<!-- Name each new dependency and the one-line reason it's needed. Was it verified against the current Expo SDK compatibility, and does Expo not already provide this? -->

## Screenshots / recording (if UI changed)
