# Contributing

## Branching

Branch from `main`: `feature/<short-description>`, `fix/<short-description>`,
`chore/<short-description>`. Open a PR against `main` using the provided
template (`.github/pull_request_template.md`).

## Commits

Conventional, imperative subject line: `feat(attendance): add offline sync adapter`,
`fix(api): correct idempotency header on PATCH`, `chore(deps): bump expo-router`.
Keep the "why" in the body when it's not obvious from the diff.

## Where code belongs

Read `docs/architecture/overview.md` and
`docs/architecture/services-vs-features.md` first. In short: route files
(`app/`) contain no logic, feature code lives in its
`src/features/<domain>/`, and anything cross-feature is infrastructure in
`src/services`. `scripts/check-architecture.js` enforces the dependency
direction in CI - a PR that fails it needs a code change, not an exception.

## Dependency changes

Before adding a dependency:

1. Check whether Expo already provides the capability.
2. Check compatibility with the current Expo SDK (`npx expo install <pkg>`
   for anything with native code - it resolves an SDK-compatible version
   automatically; plain `npm install` for pure-JS packages).
3. Check it's actively maintained and not a near-duplicate of something
   already in `package.json`.
4. State the one-line reason in the PR description (the PR template asks
   for this).

Do not run broad dependency upgrades as a side effect of an unrelated PR.
`package-lock.json` must be committed and match `package.json` - CI installs
with `npm ci`, which fails on a mismatch.

## API / backend contract changes

If a screen needs a field or endpoint that isn't in the current API
documentation, don't invent it. Isolate the assumption in an adapter (see
`src/services/auth/authentication/authService.ts` for the pattern) and add
an entry to `docs/api/gaps.md` describing exactly what's unconfirmed.

## Architecture changes

Changes to `src/services/*`, `src/navigation/*`, `src/context/*`,
`eslint.config.js`, `scripts/*`, or anything under `.github/` affect every
feature team - flag these explicitly in the PR description and expect closer
review (see `.github/CODEOWNERS` - replace its placeholder team names with
real ones before relying on it for enforcement).

## Testing expectations

Every PR touching `src/services` needs a test covering the new/changed
behavior, not just a happy-path smoke test - see `docs/testing/overview.md`
for what "real" means here. UI-only changes with no new logic don't need a
new test, but shouldn't break an existing one.

## Security expectations

- Never commit a real `.env` file - only `.env.example`.
- Never store a credential in `AsyncStorage` - use `src/services/storage/secure`.
- Never call `fetch`/`axios` directly from a feature - use `src/services/api`.
- Run `npm run check:security` (part of `npm run validate`) before pushing;
  it scans for `service_role` strings, private-key blocks, and
  secret-shaped `EXPO_PUBLIC_*` variable names.

## Code review

At least one approval from a CODEOWNERS-matched reviewer before merging.
PRs touching cross-cutting infrastructure or CI/architecture tooling should
get a second look from a mobile lead, even if CODEOWNERS doesn't strictly
require it.
