# Architecture overview

School EOS mobile is a single Expo Router app serving the mobile-facing
School EOS roles: **Principal** (mobile half only - full app is web),
**Faculty**, **Parent**, **Hostel Warden**, and **Bus Attendant**. Admin,
Vice Principal, and Finance/Accounts are web-only (Next.js) and have no
screens in this repo. Canteen Vendor operates the separate native Kotlin
terminal product, not this app - see "Product boundary" below.

## Repository layout

```
app/            Expo Router route layer ONLY - no business logic
src/
  components/   Reusable, feature-agnostic UI (layout/ and ui/)
  constants/    Global constants (roles, env-derived config)
  context/      Provider composition root (src/context/AppProviders.tsx)
  features/     One folder per School EOS domain - see feature-boundaries.md
  hooks/        Cross-feature reusable hooks only
  navigation/   Capability/role resolution for UX (not the security boundary)
  services/     Cross-feature infrastructure - see services-vs-features.md
  store/        Zustand stores for ephemeral cross-screen UI state only
  theme/        Design tokens + ThemeProvider
  types/        Shared, framework-agnostic types
  utils/        Pure, framework-independent utilities
tests/          unit/ (real, run in CI), integration/ and e2e/ (reserved)
docs/           This documentation set
scripts/        check-architecture.js, check-security.js (both run in CI)
```

## Dependency direction rules

Enforced by `scripts/check-architecture.js` in CI, not just convention:

1. **A feature never imports another feature's internals.** Share code via
   `src/services`, `src/components`, or `src/types`.
2. **`src/components` never imports from `src/features`.** Shared UI stays
   feature-agnostic.
3. **`src/services` never imports from `src/components` or `src/features`.**
   Services are infrastructure; the dependency points one way.
4. **No raw `fetch()` outside `src/services/api/client`.** All network calls
   go through `apiRequest` (`src/services/api`).
5. **No direct `expo-secure-store` outside `src/services/storage/secure`**,
   and **no direct `expo-sqlite` outside `src/services/storage`.**

## Product boundary (from the source audit)

The mobile technology is React Native + Expo, one app, Expo Router for
navigation. Three contradictions surfaced while reconciling the HLD, LLD
v5.1, API docs v4.0, and the login-by-login workflow specs were resolved
before this scaffold was built - see `docs/authorization/overview.md` for
the full reconciliation:

- No "Sports Manager" role - Sports Faculty is an assignment on Faculty.
- Canteen Vendor is out of scope for this repo - it runs the separate native
  Kotlin terminal (SAM-module/NFC hardware access needs native code; see the
  HLD §4.4-4.9). Do not add a `canteen-vendor` surface here.
- Principal's mobile half (approvals, SOS, live bus map, announcements,
  lookup) IS in scope, alongside their full web app.

## State management

See `docs/architecture/state-management.md`.

## Offline architecture

See `docs/offline/overview.md`.
