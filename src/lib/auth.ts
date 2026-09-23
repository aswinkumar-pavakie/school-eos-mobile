// Token storage (expo-secure-store -- Keychain on iOS, Keystore on Android, never
// AsyncStorage) plus the silent-refresh wrapper every authenticated call goes
// through: check the stored access token's expiry, transparently refresh via the
// stored refresh token if needed, retry once on a 401 in case the session was
// revoked server-side between the freshness check and the call.

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, apiRequest, type ApiRequestOptions } from './api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PUSH_TOKEN_KEY = 'expoPushToken';

// Faculty <-> Class Teacher account switching: the ACTIVE_* keys above stay
// exactly as they were (every existing call site -- authedRequest,
// getValidAccessToken, etc. -- keeps working unchanged, always against
// "whichever identity is active right now"). A second, LINKED slot holds
// the other identity's own token pair once the user has switched at least
// once, so switching back doesn't need the password again. ACTIVE_LABEL_KEY
// records which identity the ACTIVE slot currently holds, purely for UI
// ("Switch to Class Teacher" vs "Switch to Faculty").
const LINKED_ACCESS_TOKEN_KEY = 'linkedAccessToken';
const LINKED_REFRESH_TOKEN_KEY = 'linkedRefreshToken';
const ACTIVE_LABEL_KEY = 'activeIdentityLabel';
const LINKED_LABEL_KEY = 'linkedIdentityLabel';
// Purely for display (an Instagram-style "which account" list) -- the
// identifier (email/mobile) typed in at login time for each slot. Never
// read for any authorization or switching decision; only the token pairs
// above are. Written alongside the label at every point the label is
// written/swapped, so the two can never drift apart.
const ACTIVE_IDENTIFIER_KEY = 'activeIdentityIdentifier';
const LINKED_IDENTIFIER_KEY = 'linkedIdentityIdentifier';

export type IdentityLabel = 'FACULTY' | 'CLASS_TEACHER' | 'OTHER';

function labelForRoles(roles: RoleSummary[]): IdentityLabel {
  if (roles.some((r) => r.role_code === 'FACULTY')) return 'FACULTY';
  if (roles.some((r) => r.role_code === 'CLASS_ADVISOR')) return 'CLASS_TEACHER';
  return 'OTHER';
}

// expo-secure-store has no web implementation (it's a Keychain/Keystore wrapper --
// there's no OS-level secure enclave in a browser) and throws if called there. The
// real target platforms are iOS/Android only, per spec -- this exists solely so the
// Expo web preview build (configured in app.config.ts) degrades instead of hard
// crashing at launch. localStorage is NOT secure storage; nothing here changes the
// iOS/Android path, which always uses SecureStore.
const isWeb = Platform.OS === 'web';

async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
}

export interface RoleSummary {
  role_code: string;
  scope_type: string;
  scope_id: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  person: PersonSummary;
  roles: RoleSummary[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** No valid session could be established -- caller should send the user back to login. */
export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired, please sign in again.');
    this.name = 'AuthExpiredError';
  }
}

// ---- Storage --------------------------------------------------------------------

async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    setSecureItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setSecureItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

async function clearTokens(): Promise<void> {
  await Promise.all([deleteSecureItem(ACCESS_TOKEN_KEY), deleteSecureItem(REFRESH_TOKEN_KEY)]);
}

async function clearLinkedTokens(): Promise<void> {
  await Promise.all([
    deleteSecureItem(LINKED_ACCESS_TOKEN_KEY),
    deleteSecureItem(LINKED_REFRESH_TOKEN_KEY),
    deleteSecureItem(LINKED_LABEL_KEY),
    deleteSecureItem(LINKED_IDENTIFIER_KEY),
  ]);
}

export async function getStoredAccessToken(): Promise<string | null> {
  return getSecureItem(ACCESS_TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return getSecureItem(REFRESH_TOKEN_KEY);
}

/** Which identity the ACTIVE slot currently holds -- 'OTHER' (or null,
 * before any login) for every role that isn't part of the Faculty/Class
 * Teacher switch. */
export async function getActiveIdentityLabel(): Promise<IdentityLabel | null> {
  return (await getSecureItem(ACTIVE_LABEL_KEY)) as IdentityLabel | null;
}

/** The OTHER identity's label, if a linked session is stored -- drives the
 * "Switch to Class Teacher" / "Switch to Faculty" button text without
 * needing a network call. */
export async function getLinkedIdentityLabel(): Promise<IdentityLabel | null> {
  return (await getSecureItem(LINKED_LABEL_KEY)) as IdentityLabel | null;
}

/** Display-only identifiers for the account-switcher list -- see
 * ACTIVE_IDENTIFIER_KEY's own comment. */
export async function getActiveIdentifier(): Promise<string | null> {
  return getSecureItem(ACTIVE_IDENTIFIER_KEY);
}
export async function getLinkedIdentifier(): Promise<string | null> {
  return getSecureItem(LINKED_IDENTIFIER_KEY);
}

// ---- JWT expiry (decode only, never trust for authorization) --------------------

function decodeAccessTokenPayload(token: string): { exp?: unknown; sub?: unknown } | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(base64);
    return JSON.parse(json) as { exp?: unknown; sub?: unknown };
  } catch {
    return null;
  }
}

function decodeAccessTokenExpiry(token: string): number | null {
  const decoded = decodeAccessTokenPayload(token);
  return decoded && typeof decoded.exp === 'number' ? decoded.exp : null;
}

/** The currently signed-in person's id (JWT `sub`), decode-only -- never
 * used for authorization, only to tell "which person is this local device
 * state for" apart (see e2ee/storage.ts's DeviceIdentity.personId). */
export async function getCurrentPersonId(): Promise<string | null> {
  const token = await getStoredAccessToken();
  if (!token) return null;
  const decoded = decodeAccessTokenPayload(token);
  return decoded && typeof decoded.sub === 'string' ? decoded.sub : null;
}

const EXPIRY_SKEW_SECONDS = 30;

function isExpiredOrExpiringSoon(token: string): boolean {
  const exp = decodeAccessTokenExpiry(token);
  if (exp === null) return true;
  return exp - Math.floor(Date.now() / 1000) <= EXPIRY_SKEW_SECONDS;
}

// Faculty (every assignment), Parent, Hostel Warden, Principal's mobile half,
// Vice Principal, and (new) the standalone Community login -- the only app
// logins. Vice Principal moved here from web-only -- see WEB_ALLOWED_ROLES in
// school-eos-website/src/app/(auth)/login/actions.ts. Bus Attendant/Canteen Vendor
// use a separate device-credential flow, not this one. The backend's /auth/login
// itself doesn't restrict by client, so the platform boundary is enforced here.
// Faculty always carries the base FACULTY role_code alongside any
// assignment-specific ones (Class Advisor, Academic Coordinator, etc.), so
// checking for FACULTY covers every assignment without having to enumerate them.
// CLASS_ADVISOR is listed separately because a Class Teacher login is its
// own, genuinely separate person/account (see backend's
// class-teacher-login.service.ts) that carries ONLY CLASS_ADVISOR -- never
// FACULTY -- so the FACULTY check alone wouldn't admit it.
const MOBILE_ALLOWED_ROLES = ['FACULTY', 'CLASS_ADVISOR', 'PARENT', 'HOSTEL_WARDEN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'COMMUNITY', 'SPORTS_ADMIN', 'DRIVER'];

/** Login succeeded against the backend, but this role has no mobile access. */
export class PlatformNotAllowedError extends Error {
  constructor() {
    super('This account does not have access to the mobile app.');
    this.name = 'PlatformNotAllowedError';
  }
}

// ---- Login / logout / refresh ----------------------------------------------------

interface LoginResponseBody {
  data: LoginResult;
}

interface RefreshResponseBody {
  data: TokenPair;
}

export async function login(identifier: string, password: string): Promise<LoginResult> {
  const res = await apiRequest<LoginResponseBody>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });

  const hasMobileAccess = res.data.roles.some((r) => MOBILE_ALLOWED_ROLES.includes(r.role_code));
  if (!hasMobileAccess) {
    // Revoke the session we just issued -- never hold a valid token pair for a role
    // this app doesn't serve, even briefly.
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: res.data.refreshToken },
    }).catch(() => {});
    throw new PlatformNotAllowedError();
  }

  // A plain login (the login screen, not the switch flow) always replaces
  // the whole session -- any previously-linked identity from a different
  // person no longer applies.
  await clearLinkedTokens();
  await storeTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
  await setSecureItem(ACTIVE_LABEL_KEY, labelForRoles(res.data.roles));
  await setSecureItem(ACTIVE_IDENTIFIER_KEY, identifier);
  return res.data;
}

export async function logout(): Promise<void> {
  // Best-effort: a device that's been signed out should stop receiving this
  // person's push notifications, especially on a shared/handed-back device.
  // Must run BEFORE clearTokens() -- it needs a still-valid session to call
  // the authed unregister endpoint at all.
  await unregisterCurrentPushToken();

  // Sign out of BOTH identities, not just the active one -- "log out" on a
  // shared/handed-back device should never leave a linked session usable.
  const refreshTokensToRevoke = [
    await getStoredRefreshToken(),
    await getSecureItem(LINKED_REFRESH_TOKEN_KEY),
  ].filter((t): t is string => !!t);
  await Promise.all(
    refreshTokensToRevoke.map((refreshToken) =>
      apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {
        // Best-effort server-side revoke; tokens are cleared locally regardless.
      }),
    ),
  );
  await clearTokens();
  await clearLinkedTokens();
  await deleteSecureItem(ACTIVE_LABEL_KEY);
  await deleteSecureItem(ACTIVE_IDENTIFIER_KEY);
}

/** Exported so callers with their own non-header-based auth transport (e.g.
 * ai-bot-api.ts, whose bot forwards the access token in a JSON body, not an
 * Authorization header) can force a real refresh on their own 401 instead of
 * re-deriving this logic -- getValidAccessToken() alone won't do it, since it
 * only refreshes when the LOCAL expiry check says so, not on a server-side
 * revoke the local clock can't see. */
export async function refreshTokens(): Promise<TokenPair | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await apiRequest<RefreshResponseBody>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    await storeTokens(res.data);
    return res.data;
  } catch {
    await clearTokens();
    return null;
  }
}

/** A currently-valid access token, refreshing first if the stored one is missing,
 * expired, or within EXPIRY_SKEW_SECONDS of expiring. */
export async function getValidAccessToken(): Promise<string> {
  const accessToken = await getStoredAccessToken();
  if (accessToken && !isExpiredOrExpiringSoon(accessToken)) {
    return accessToken;
  }

  const refreshed = await refreshTokens();
  if (!refreshed) throw new AuthExpiredError();
  return refreshed.accessToken;
}

// ---- Faculty <-> Class Teacher account switching -----------------------------------

/** True if a linked identity's session is already stored -- the caller uses
 * this to decide whether "Switch" can happen instantly or needs to route to
 * the credential-entry screen first. */
export async function hasLinkedIdentity(): Promise<boolean> {
  return (await getSecureItem(LINKED_REFRESH_TOKEN_KEY)) !== null;
}

/** Instant switch: swaps the ACTIVE and LINKED slots in place. Caller must
 * still clear any cached ['me']/role-scoped query data afterward (same
 * cache-bleed fix LoginForm.tsx already applies on a normal login) -- this
 * function only moves tokens. Returns false if nothing is linked yet. */
export async function switchToLinkedIdentity(): Promise<boolean> {
  const [linkedAccess, linkedRefresh, linkedLabel] = await Promise.all([
    getSecureItem(LINKED_ACCESS_TOKEN_KEY),
    getSecureItem(LINKED_REFRESH_TOKEN_KEY),
    getSecureItem(LINKED_LABEL_KEY),
  ]);
  if (!linkedAccess || !linkedRefresh || !linkedLabel) return false;

  const [activeAccess, activeRefresh, activeLabel, linkedIdentifier, activeIdentifier] = await Promise.all([
    getStoredAccessToken(),
    getStoredRefreshToken(),
    getActiveIdentityLabel(),
    getLinkedIdentifier(),
    getActiveIdentifier(),
  ]);

  await Promise.all([
    setSecureItem(ACCESS_TOKEN_KEY, linkedAccess),
    setSecureItem(REFRESH_TOKEN_KEY, linkedRefresh),
    setSecureItem(ACTIVE_LABEL_KEY, linkedLabel),
    linkedIdentifier ? setSecureItem(ACTIVE_IDENTIFIER_KEY, linkedIdentifier) : deleteSecureItem(ACTIVE_IDENTIFIER_KEY),
    activeAccess ? setSecureItem(LINKED_ACCESS_TOKEN_KEY, activeAccess) : deleteSecureItem(LINKED_ACCESS_TOKEN_KEY),
    activeRefresh ? setSecureItem(LINKED_REFRESH_TOKEN_KEY, activeRefresh) : deleteSecureItem(LINKED_REFRESH_TOKEN_KEY),
    activeLabel ? setSecureItem(LINKED_LABEL_KEY, activeLabel) : deleteSecureItem(LINKED_LABEL_KEY),
    activeIdentifier ? setSecureItem(LINKED_IDENTIFIER_KEY, activeIdentifier) : deleteSecureItem(LINKED_IDENTIFIER_KEY),
  ]);
  return true;
}

/** First-time switch: a real login call against the OTHER identity's own
 * credentials (Admin communicates a Class Teacher login's email/password to
 * the faculty member out of band -- same as the existing Academic
 * Coordinator login). On success, the CURRENT active session moves into the
 * LINKED slot (so switching back needs no password) and the new session
 * becomes active. Rejects with PlatformNotAllowedError via the normal
 * MOBILE_ALLOWED_ROLES check if the credentials somehow don't resolve to a
 * mobile-allowed role. */
export async function linkAndSwitchIdentity(identifier: string, password: string): Promise<LoginResult> {
  const res = await apiRequest<LoginResponseBody>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });

  const hasMobileAccess = res.data.roles.some((r) => MOBILE_ALLOWED_ROLES.includes(r.role_code));
  if (!hasMobileAccess) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: res.data.refreshToken },
    }).catch(() => {});
    throw new PlatformNotAllowedError();
  }

  const [previousAccess, previousRefresh, previousLabel, previousIdentifier] = await Promise.all([
    getStoredAccessToken(),
    getStoredRefreshToken(),
    getActiveIdentityLabel(),
    getActiveIdentifier(),
  ]);

  await Promise.all([
    previousAccess ? setSecureItem(LINKED_ACCESS_TOKEN_KEY, previousAccess) : Promise.resolve(),
    previousRefresh ? setSecureItem(LINKED_REFRESH_TOKEN_KEY, previousRefresh) : Promise.resolve(),
    previousLabel ? setSecureItem(LINKED_LABEL_KEY, previousLabel) : Promise.resolve(),
    previousIdentifier ? setSecureItem(LINKED_IDENTIFIER_KEY, previousIdentifier) : Promise.resolve(),
  ]);
  await storeTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
  await setSecureItem(ACTIVE_LABEL_KEY, labelForRoles(res.data.roles));
  await setSecureItem(ACTIVE_IDENTIFIER_KEY, identifier);

  return res.data;
}

/**
 * Authenticated request: attaches a guaranteed-fresh access token and retries once
 * on a 401 (session revoked between the freshness check and the call). This is the
 * wrapper every authenticated screen/action should call through instead of
 * apiRequest directly.
 */
export async function authedRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const accessToken = await getValidAccessToken();

  try {
    return await apiRequest<T>(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const refreshed = await refreshTokens();
    if (!refreshed) throw new AuthExpiredError();

    return apiRequest<T>(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${refreshed.accessToken}` },
    });
  }
}

// ---- Push notification device token (session-lifecycle, not a feature concern) ---
//
// Lives here, not in a services/notifications file, for the same reason
// storeTokens/clearTokens do: "what happens on login" / "what happens on
// logout" for THIS device's session is auth.ts's own job. The Expo-SDK-specific
// half (permission prompt, getExpoPushTokenAsync, notification-tap handling)
// lives in src/services/notifications/push-token.ts and calls back into these
// two functions -- never the other way around.

/** Called once per real login (and again any time Expo hands the app a fresh
 * token, e.g. after a reinstall). Remembers the token locally too, purely so
 * logout() can unregister the exact same one later without re-deriving it. */
export async function registerPushToken(expoPushToken: string, platform: 'ANDROID' | 'IOS'): Promise<void> {
  await authedRequest('/notifications/device-token', {
    method: 'POST',
    body: { expoPushToken, platform },
  });
  await setSecureItem(PUSH_TOKEN_KEY, expoPushToken);
}

/** Best-effort -- a failed unregister (offline, expired session) should never
 * block sign-out; the row is also harmless left behind (a stale token just
 * fails delivery and gets pruned server-side on the next send attempt). */
async function unregisterCurrentPushToken(): Promise<void> {
  const token = await getSecureItem(PUSH_TOKEN_KEY);
  if (!token) return;
  await authedRequest(`/notifications/device-token/${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => {});
  await deleteSecureItem(PUSH_TOKEN_KEY);
}

// ---- Self-service password reset (Parent flow) -----------------------------------

export async function requestPasswordReset(identifier: string): Promise<void> {
  await apiRequest('/auth/password-reset/request', { method: 'POST', body: { identifier } });
}

export async function completePasswordReset(identifier: string, otp: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/password-reset/complete', {
    method: 'POST',
    body: { identifier, otp, newPassword },
  });
}

// ---- Session state (cold-boot routing) --------------------------------------------

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

/** Presence of a stored refresh token, checked once at app launch, to decide
 * between the (auth) and (protected) route groups. Deliberately not
 * expiry-aware -- an expired-but-present refresh token still means "attempt the
 * protected area," and the first authenticated call there will refresh or, if the
 * refresh token itself is dead, throw AuthExpiredError for that screen to handle. */
export function useSession(): { status: SessionStatus } {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    getStoredRefreshToken().then((token) => {
      if (!cancelled) setStatus(token ? 'signedIn' : 'signedOut');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}
