# API client

One controlled entry point: `apiRequest<T>(path, options)` in
`src/services/api/client/apiClient.ts`. Features must not call
`fetch`/`axios` directly - `scripts/check-architecture.js` fails CI on a raw
`fetch()` call outside `src/services/api/client`.

## What it does on every call

- Prefixes `path` with `API_BASE_URL + /api/v1`.
- Attaches `Authorization: Bearer <token>` (unless `skipAuth: true` - only
  for login/refresh), `Accept`, `X-Request-Id` (always, for correlation),
  `Content-Type` (only when there's a body), `Idempotency-Key` (on
  mutating methods - auto-generated if you don't supply one, but pass your
  own when the same logical operation might be retried, e.g. from the
  offline queue), and `If-Match` (when you pass one, for optimistic
  concurrency).
- Applies a timeout (`NETWORK.defaultTimeoutMs`, override per call) via
  `AbortController`, and honors a caller-supplied `signal` for cancellation.
- Unwraps the success envelope's `data` and returns it typed as `T`.
- Maps any non-2xx response to an `ApiError` carrying the server's `code`,
  `message`, and `details` verbatim - never collapsed to a generic message
  (see `src/services/api/errors/mapError.ts`).
- On a 401, attempts exactly one token refresh via the auth-hooks seam, then
  retries the request once; if refresh fails, calls `onSessionExpired()`.

## What it deliberately does NOT do

- **Does not auto-retry mutations.** `ApiError.isRetryable` only covers
  transport-level failures (network/timeout/dependency-unavailable) -
  `VALIDATION_ERROR`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, and
  `SEMANTIC_RULE_VIOLATION` are never retried automatically, because
  retrying a write blindly risks a second business effect. Pass
  `allowRetry: true` only for safe, read-only `GET` requests.
- **Does not implement the offline queue.** That's
  `src/services/offline` - a feature enqueues a durable command there and
  the sync engine replays it through this same client later.

## Error codes

See `src/types/api.ts` for the full `ApiErrorCode` union, reconciled from
API docs v4.0 §2.5 and LLD v5.1 Annex B.3 - this is a closed set matching the
backend's documented HTTP status contract, not invented client-side codes.
