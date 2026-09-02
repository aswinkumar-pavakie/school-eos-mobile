# School EOS Mobile

The React Native (Expo) mobile frontend for School EOS - a single-school
operations system. This repository serves the mobile-facing roles:
**Principal** (mobile half), **Faculty**, **Parent**, **Hostel Warden**, and
**Bus Attendant**. Admin, Vice Principal, and Finance/Accounts are web-only
(a separate Next.js app) and Canteen Vendor runs a separate native Kotlin
terminal - neither has a surface here. See
`docs/architecture/overview.md` for the full product-boundary reasoning.

**This is a production foundation, not a finished app.** Core
infrastructure (API client, auth/session, offline queue, storage, theming,
navigation shell) is built and tested. Feature screens are intentionally not
implemented yet - each `src/features/<domain>/README.md` documents what
belongs there and what's already known about it from the source-document
audit, ready for feature teams to build against.

## Stack

Expo SDK 57 · Expo Router · React Native · TypeScript (strict) · TanStack
Query (server state) · Zustand (client/session state) · expo-sqlite (offline
queue) · expo-secure-store (credentials).

## Getting started

See `docs/development/getting-started.md`. Short version:

```bash
npm install
cp .env.example .env.local
npm start
```

## Documentation map

| Topic                                                    | File                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| Architecture, repo layout, dependency rules              | `docs/architecture/overview.md`             |
| `services/` vs `features/` boundary                      | `docs/architecture/services-vs-features.md` |
| State management (Query vs. Zustand vs. local)           | `docs/architecture/state-management.md`     |
| API client, error taxonomy                               | `docs/api/client.md`                        |
| Known API contract gaps - read before assuming a DTO     | `docs/api/gaps.md`                          |
| Authentication                                           | `docs/authentication/overview.md`           |
| Authorization / role model / source-audit reconciliation | `docs/authorization/overview.md`            |
| Offline queue architecture                               | `docs/offline/overview.md`                  |
| Security (storage, secrets, logging)                     | `docs/security/overview.md`                 |
| Testing strategy                                         | `docs/testing/overview.md`                  |
| Release / EAS / placeholders to fill in                  | `docs/release/eas.md`                       |
| Contributing                                             | `CONTRIBUTING.md`                           |

## Validation

```bash
npm run validate
```

Runs typecheck, lint, format check, unit tests, the architecture-boundary
check, and the secret scan - exactly what CI runs on every PR.
