# Testing

## What exists today

`tests/unit/` - real tests, run in CI (`npm run test`):

- `services/api/errors.test.ts`, `services/api/headers.test.ts`,
  `services/api/apiClient.test.ts` - error-code preservation, retryability
  classification, header construction, idempotency-key attachment on
  mutations, 401→refresh→retry behavior.
- `services/offline/backoff.test.ts`,
  `services/offline/queueRepository.test.ts` - backoff bounds, queue
  ordering, status transitions, per-actor isolation (an account's queue
  never leaks into another's).
- `navigation/capabilities.test.ts` - role/assignment resolution, deny-by-default.

`tests/integration/` and `tests/e2e/` are reserved (see their READMEs) -
empty until there's real feature behavior worth exercising end to end; they
are not stub files to fill in for their own sake.

## Principles

- **Test behavior that protects architecture or safety-critical logic**,
  not implementation details. A test that would pass even if the code were
  subtly wrong is worse than no test.
- **Offline/idempotency logic gets tests before UI polish does** - a bug in
  "does a retry double-charge someone" is categorically worse than a layout bug.
- **Mock at the boundary, not the logic.** `queueRepository.test.ts` fakes
  `expo-sqlite` (a native module unavailable under Jest) with a small
  in-memory array-backed implementation of just the methods the repository
  uses - it exercises the repository's real SQL/ordering/status logic, not
  a mocked-away version of it.

## Adding a feature's tests

Once a feature has real API calls, add:

- A unit test for its sync adapter's outcome handling (if offline-capable).
- An integration test in `tests/integration/` once it's plausible to
  exercise sign-in → the feature's first real request end to end.
