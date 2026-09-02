# Known API contract gaps

Recorded during the source audit (School EOS API documentation v4.0, LLD
v5.1). Do not silently invent answers to these - build the adapter/interface
and update this file, or confirm the answer with whoever owns the backend
contract before shipping the assumption.

## Auth token format

Neither the API docs nor the LLD specify whether the access token is a JWT
or an opaque string, its expiry, or its claims schema (the HLD separately
describes a JWT with 15-minute expiry + `personId`/roles, but that is not
confirmed as the frozen `v4.0` contract). `src/services/auth/authentication/authService.ts`
treats both tokens as opaque strings on purpose - do not decode/inspect the
access token client-side until this is confirmed.

## Login/refresh/me request-response DTOs

The base ~628 endpoints (everything outside the ~60 new/corrected endpoints
in API docs v4.0 §4) have no field-level request/response schema in the
document - only method, path, one-line purpose, and access level. This
includes `POST /auth/login`, `POST /auth/refresh`, and `GET /me`.
`src/services/auth/authentication/authService.ts` isolates this assumption
in one file on purpose - update it, and only it, once the real contract is available.

## Push notification token registration

No endpoint exists anywhere in the API docs for registering a push token
against a user or device, despite an otherwise fully-specified notification
subsystem (in-app inbox, preferences, provider delivery-events webhook).
`src/services/notifications/push/pushToken.ts` implements client-side
permission/token retrieval only; `sendTokenToBackend` throws deliberately
until this contract exists.

## Bus Attendant NFC tap capture - which device?

The HLD states the bus terminal is a dedicated NFC Android phone (native,
non-Expo hardware integration - HLD §4.2/§4.4). The API docs tag
`POST /transport/trips/{tripId}/boardings` as `🔌 DEVICE` (not `📱 APP`),
while the Bus Attendant's oversight screens (`GET .../boardings`,
`/exceptions`, `/boarding/close`) are `📱 APP`. Read together, this app
almost certainly does NOT perform the raw NFC tap - that's the separate
terminal - but this app owns the attendant's trip management/oversight/close
actions. Confirm before building `features/transport`'s Bus Attendant screens.

## Pagination request parameters

The response envelope's `meta.page`/`pageSize`/`total` shape is documented;
the corresponding request query parameter names (`page`/`pageSize` vs.
`limit`/`offset` vs. cursor-based) are not specified anywhere.

## Rate limiting

Only `POST /finance/payment-events` has a stated rate limit ("per source
IP"). No general policy exists for the rest of the surface.

## Endpoint count / version-number inconsistencies (informational, not blocking)

The LLD v5.1 self-identifies inconsistently in places (a "v3.0" status line
and a "v5.0 edition" reference inside a document that is v5.1 throughout;
stale citations to a "corrected API v2.0 source" repeated across ~24
sections when the canonical source is v4.0/v4.1 everywhere else). The API
docs and LLD both separately acknowledge the 684 vs. 688 endpoint-count
figure has never fully reconciled, and preserve that discrepancy rather than
silently resolving it. None of this blocks the scaffold; flagged here for
whoever owns the next documentation revision.
