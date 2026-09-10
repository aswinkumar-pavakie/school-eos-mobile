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

export async function getStoredAccessToken(): Promise<string | null> {
  return getSecureItem(ACCESS_TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return getSecureItem(REFRESH_TOKEN_KEY);
}

// ---- JWT expiry (decode only, never trust for authorization) --------------------

function decodeAccessTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(base64);
    const decoded = JSON.parse(json) as { exp?: unknown };
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
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
const MOBILE_ALLOWED_ROLES = ['FACULTY', 'PARENT', 'HOSTEL_WARDEN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'COMMUNITY'];

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

  await storeTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
  return res.data;
}

export async function logout(): Promise<void> {
  // Best-effort: a device that's been signed out should stop receiving this
  // person's push notifications, especially on a shared/handed-back device.
  // Must run BEFORE clearTokens() -- it needs a still-valid session to call
  // the authed unregister endpoint at all.
  await unregisterCurrentPushToken();

  const refreshToken = await getStoredRefreshToken();
  if (refreshToken) {
    await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {
      // Best-effort server-side revoke; tokens are cleared locally regardless.
    });
  }
  await clearTokens();
}

async function refreshTokens(): Promise<TokenPair | null> {
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
