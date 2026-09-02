# auth

Status: infrastructure only - no screens yet.

Login/session/token infrastructure lives in `src/services/auth` (it's cross-feature
infrastructure, not one feature's concern - see `docs/architecture/services-vs-features.md`).
The `(auth)` route group (`app/(auth)/sign-in.tsx`) already wires that infrastructure end to end.

This feature folder is reserved for **auth-adjacent screens that are not session
plumbing**: password reset request/confirm, MFA enrollment UI, account-locked
messaging. Add `api/`, `components/`, `hooks/`, `screens/`, `store/`, `types/`,
`validation/` subfolders as needed - do not add empty ones speculatively.

**Source**: API docs v4.0 §Auth (16 endpoints, all platform `BOTH`); HLD §1.1 (NestJS-owned
auth, Argon2id, TOTP MFA, one-time parent password reset allowance).
