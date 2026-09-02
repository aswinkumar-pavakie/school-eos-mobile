# Authentication

Infrastructure lives in `src/services/auth`; the `(auth)` route group wires
it into the app. See `docs/api/gaps.md` for the parts of this contract that
are not yet frozen by the backend - do not treat the DTOs in
`src/services/auth/authentication/authService.ts` as confirmed.

## Flow

1. `useSessionStore().signIn(identifier, password)` calls `POST /auth/login`
   (`skipAuth: true`), persists the returned tokens to
   `src/services/storage/secure` (never `AsyncStorage`), then calls
   `GET /me` to load roles/assignments.
2. `useSessionStore().hydrate()` runs once at app bootstrap
   (`src/context/AppProviders.tsx`): loads persisted tokens, re-fetches
   `/me`, and sets `status: 'authenticated'` or `'unauthenticated'`. Any
   failure clears tokens rather than leaving a half-valid session.
3. The API client and the session store are connected through a dependency-
   inversion seam (`src/services/api/client/authHooks.ts`,
   `registerSessionAuthHooks()`), not a direct import - this avoids a
   circular dependency (refresh itself calls the API client).
4. `signOut()` calls `POST /auth/logout` best-effort, clears secure storage,
   clears that account's offline queue (`clearForActor`), and resets the
   local SQLite database. **An account switch must never replay another
   account's queued offline writes** - this is why sign-out clears the queue
   by actor ID before resetting the DB.

## What NOT to do

- Never store tokens in `AsyncStorage` - only
  `src/services/storage/secure` (iOS Keychain / Android Keystore).
- Never decode/trust client-side claims from the access token for
  authorization decisions - the backend is authoritative (see
  `docs/authorization/overview.md`).
- Never invent a login/refresh/me request field that isn't in the API docs
  or explicitly logged in `docs/api/gaps.md`.
