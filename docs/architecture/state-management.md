# State management

Three kinds of state, three tools. Do not blur these.

| State                                                                       | Tool                                   | Where                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server/remote data (student records, attendance, wallet balance, ...)       | TanStack Query                         | Inside each feature's `hooks/` - one `useQuery`/`useMutation` per operation                                                                                                                                             |
| Small, ephemeral, cross-screen UI state (a toast queue, a dismissed banner) | Zustand                                | `src/store/` - see `src/store/uiStore.ts` for the shape this should take                                                                                                                                                |
| Session/auth state                                                          | Zustand, but treated as infrastructure | `src/services/auth/session/sessionStore.ts` - not `src/store`, because it's a cross-cutting infrastructure concern the API client itself depends on (see the auth-hooks seam in `src/services/api/client/authHooks.ts`) |
| Local-only UI state (a form field, an expanded/collapsed row)               | `useState`/`useReducer`                | Inside the component - do not lift this into a store                                                                                                                                                                    |

## What NOT to do

- **Never duplicate server state into Zustand.** If it came from `apiRequest`,
  it belongs in a Query cache, not a store. A store that mirrors "the
  student list" or "today's attendance" will drift from the server and
  become a second source of truth to debug.
- **Never build one giant global store.** `src/store/uiStore.ts` is the
  pattern - small, single-purpose stores (or slices), not one store holding
  the whole app's state.
- **Never put an offline queue item's business meaning in a store.** The
  queue (`src/services/offline`) is durable SQLite state, not in-memory
  Zustand state - it must survive an app kill.

## QueryClient configuration

`src/context/AppProviders.tsx` sets `mutations.retry: false` deliberately -
mutation retries are a per-feature decision gated on idempotency, never a
blanket default (see `docs/offline/overview.md` and
`src/services/api/errors/ApiError.ts`'s `isRetryable` for why).
