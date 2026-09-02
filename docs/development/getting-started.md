# Getting started

## Prerequisites

- Node.js 22.x (matches CI - see `.github/workflows/ci.yml`)
- npm (this repo commits `package-lock.json` - CI installs from it via `npm ci`; do not switch package managers)
- Expo Go (for quick device testing) or a development build for native-module testing (`expo-sqlite`, `expo-secure-store`, `expo-notifications` all require a development build - Expo Go's sandbox is enough for early UI work only)

## Setup

```bash
git clone <repo-url>
cd school-eos-mobile
npm install
cp .env.example .env.local   # then edit EXPO_PUBLIC_API_BASE_URL to point at your local/dev API
npm start
```

## Everyday commands

| Command                                           | What it does                                                 |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `npm start`                                       | Start the Metro dev server                                   |
| `npm run android` / `npm run ios` / `npm run web` | Start on a specific platform                                 |
| `npm run typecheck`                               | `tsc --noEmit`                                               |
| `npm run lint`                                    | ESLint (`eslint-config-expo` + Prettier compatibility)       |
| `npm run format` / `npm run format:check`         | Prettier write / check                                       |
| `npm run test` / `npm run test:watch`             | Jest (jest-expo preset)                                      |
| `npm run check:architecture`                      | Dependency-direction rules (`scripts/check-architecture.js`) |
| `npm run check:security`                          | Secret scan (`scripts/check-security.js`)                    |
| `npm run doctor`                                  | `expo-doctor` - project/dependency health                    |
| `npm run validate`                                | Everything above, in the order CI runs it                    |

Run `npm run validate` before opening a PR - it's exactly what CI runs.

## Where does my code go?

Start with `docs/architecture/overview.md`, then
`docs/architecture/services-vs-features.md` if you're unsure whether
something is a service or a feature concern. Each `src/features/<domain>/`
folder has its own `README.md` with domain-specific notes (which roles use
it, known API gaps, offline behavior) pulled from the source-document audit.

## Environment configuration

See `.env.example` and `docs/release/eas.md`. This app holds no secrets -
`EXPO_PUBLIC_*` variables are public runtime configuration only.
