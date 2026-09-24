// Token storage (expo-secure-store -- Keychain on iOS, Keystore on Android, never
// AsyncStorage) plus the silent-refresh wrapper every authenticated call goes
// through: check the stored access token's expiry, transparently refresh via the
// stored refresh token if needed, retry once on a 401 in case the session was
// revoked server-side between the freshness check and the call.

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { ApiError, apiRequest, type ApiRequestOptions } from './api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PUSH_TOKEN_KEY = 'expoPushToken';
// Linked-account switching (server-backed): who is signed in right now, the account
// we switched OUT of (so the sheet can offer "back" without a lookup), and the
// class name shown while in a class account.
const ACTIVE_PERSON_ID_KEY = 'activePersonId';
const HOME_ACCOUNT_KEY = 'homeAccount';
const ACTIVE_CLASS_NAME_KEY = 'activeClassName';

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
// The single LINKED_* slot above is legacy: a faculty member can advise
// several classes, each with its own login, so every non-active session now
// lives in a list -- a small index of identifiers plus one secure-store item
// per account (kept separate so no single item outgrows secure-store's size
// limit). Sessions stored by the old single-slot version are migrated on
// first read.
const OTHER_INDEX_KEY = 'otherAccountsIndex';

export type IdentityLabel = 'FACULTY' | 'CLASS_TEACHER' | 'OTHER';

interface StoredAccount {
  identifier: string;
  label: IdentityLabel;
  accessToken: string;
  refreshToken: string;
}

export interface OtherAccount {
  identifier: string;
  label: IdentityLabel;
}

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

function otherAccountKey(identifier: string): string {
  return `otherAcct_${identifier.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

async function readOtherIndex(): Promise<string[]> {
  const raw = await getSecureItem(OTHER_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeOtherIndex(ids: string[]): Promise<void> {
  if (ids.length === 0) await deleteSecureItem(OTHER_INDEX_KEY);
  else await setSecureItem(OTHER_INDEX_KEY, JSON.stringify(ids));
}

async function readOtherAccount(identifier: string): Promise<StoredAccount | null> {
  const raw = await getSecureItem(otherAccountKey(identifier));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAccount;
  } catch {
    return null;
  }
}

async function saveOtherAccount(account: StoredAccount): Promise<void> {
  await setSecureItem(otherAccountKey(account.identifier), JSON.stringify(account));
  const ids = await readOtherIndex();
  if (!ids.includes(account.identifier)) await writeOtherIndex([...ids, account.identifier]);
}

/** Moves a session stored by the old single LINKED slot into the list. */
async function migrateLegacyLinked(): Promise<void> {
  const [access, refresh, label, identifier] = await Promise.all([
    getSecureItem(LINKED_ACCESS_TOKEN_KEY),
    getSecureItem(LINKED_REFRESH_TOKEN_KEY),
    getSecureItem(LINKED_LABEL_KEY),
    getSecureItem(LINKED_IDENTIFIER_KEY),
  ]);
  if (!access && !refresh && !label && !identifier) return;
  if (access && refresh && label) {
    await saveOtherAccount({
      identifier: identifier ?? `linked-${label.toLowerCase()}`,
      label: label as IdentityLabel,
      accessToken: access,
      refreshToken: refresh,
    });
  }
  await Promise.all([
    deleteSecureItem(LINKED_ACCESS_TOKEN_KEY),
    deleteSecureItem(LINKED_REFRESH_TOKEN_KEY),
    deleteSecureItem(LINKED_LABEL_KEY),
    deleteSecureItem(LINKED_IDENTIFIER_KEY),
  ]);
}

async function readAllOtherAccounts(): Promise<StoredAccount[]> {
  await migrateLegacyLinked();
  const ids = await readOtherIndex();
  const accounts = await Promise.all(ids.map(readOtherAccount));
  return accounts.filter((a): a is StoredAccount => a !== null);
}

async function clearLinkedTokens(): Promise<void> {
  const ids = await readOtherIndex();
  await Promise.all(ids.map((id) => deleteSecureItem(otherAccountKey(id))));
  await deleteSecureItem(OTHER_INDEX_KEY);
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

/** Display-only identifiers for the account-switcher list -- see
 * ACTIVE_IDENTIFIER_KEY's own comment. */
export async function getActiveIdentifier(): Promise<string | null> {
  return getSecureItem(ACTIVE_IDENTIFIER_KEY);
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
// Vice Principal, the standalone Community login, Sports Admin, and Driver --
// the only app logins. Canteen Vendor is explicitly web-only (the user's own
// decision) -- it has no mobile screens at all in this app, and never should
// again without that decision being revisited. Bus Attendant uses a separate
// device-credential flow, not this one. The backend's /auth/login itself
// doesn't restrict by client, so the platform boundary is enforced here.
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
  await setSecureItem(ACTIVE_PERSON_ID_KEY, res.data.person.id);
  await deleteSecureItem(HOME_ACCOUNT_KEY);
  await deleteSecureItem(ACTIVE_CLASS_NAME_KEY);
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
  const otherAccounts = await readAllOtherAccounts();
  const refreshTokensToRevoke = [
    await getStoredRefreshToken(),
    ...otherAccounts.map((a) => a.refreshToken),
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
  await deleteSecureItem(ACTIVE_PERSON_ID_KEY);
  await deleteSecureItem(HOME_ACCOUNT_KEY);
  await deleteSecureItem(ACTIVE_CLASS_NAME_KEY);
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

// ---- Linked account switching (Faculty <-> Class Teacher) ---------------------------
// Design: school-eos-website/rnd-linked-account-switching.md.
// The SERVER decides who may switch to what. This phone keeps tokens for the ACTIVE
// account only -- never for the other one. "Add account" (once per phone, from the
// Faculty account) proves the admin's mapping + the class login's own password;
// after that "switch" is one call that needs no password.

export interface HomeAccount {
  personId: string;
  label: IdentityLabel;
  /** Display only, e.g. "Faculty". */
  title: string;
}

export interface AvailableClassAccount {
  linkedPersonId: string;
  /** e.g. "5-B" */
  label: string;
  /** The class login's email -- only ever sent for a class already added on this phone. */
  email?: string | null;
  emailHint: string | null;
  linkedOnThisDevice: boolean;
}

export interface LinkedPhone {
  id: string;
  linkedPersonId: string;
  label: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string;
}

function currentDevicePlatform(): 'ANDROID' | 'IOS' | 'WEB' {
  return Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
}

/** Who is signed in right now (falls back to /auth/me for sessions that predate this). */
export async function getActivePersonId(): Promise<string | null> {
  const cached = await getSecureItem(ACTIVE_PERSON_ID_KEY);
  if (cached) return cached;
  try {
    const res = await authedRequest<{ data: { person: { id: string } } }>('/auth/me');
    await setSecureItem(ACTIVE_PERSON_ID_KEY, res.data.person.id);
    return res.data.person.id;
  } catch {
    return null;
  }
}

export async function getHomeAccount(): Promise<HomeAccount | null> {
  const raw = await getSecureItem(HOME_ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HomeAccount;
  } catch {
    return null;
  }
}

/** The class accounts ALREADY added on this phone (empty until the teacher adds one -- the
 * server discloses nothing about classes that are not added). */
export async function fetchAvailableClassAccounts(): Promise<AvailableClassAccount[]> {
  const res = await authedRequest<{ data: AvailableClassAccount[] }>('/auth/linked-accounts/available');
  return res.data;
}

/** Old builds stored the other account's tokens on the phone. Those are revoked on the
 * server and removed here the first time the new flow is used. */
async function purgeLegacyStoredAccounts(): Promise<void> {
  const legacy = await readAllOtherAccounts();
  await Promise.all(
    legacy.map((a) =>
      apiRequest('/auth/logout', { method: 'POST', body: { refreshToken: a.refreshToken } }).catch(() => {}),
    ),
  );
  await clearLinkedTokens();
}

async function adoptSession(res: LoginResult): Promise<void> {
  await storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  await setSecureItem(ACTIVE_LABEL_KEY, labelForRoles(res.roles));
  await setSecureItem(ACTIVE_IDENTIFIER_KEY, res.person.email ?? '');
  await setSecureItem(ACTIVE_PERSON_ID_KEY, res.person.id);
}

/** First time on this phone: add a class account. Needs the class login's own password
 * (the second secret a leaked Faculty password does not give). On success the class
 * account becomes active and the Faculty account is remembered as "home". */
export async function addClassAccount(identifier: string, password: string): Promise<LoginResult> {
  // Refresh first: it may rotate the refresh token, which must be read afterwards.
  await getValidAccessToken();
  const [refreshToken, myId, myLabel] = await Promise.all([
    getStoredRefreshToken(),
    getActivePersonId(),
    getActiveIdentityLabel(),
  ]);
  if (!refreshToken || !myId) throw new AuthExpiredError();
  const res = await authedRequest<{ data: LoginResult & { linkedLabel?: string | null } }>('/auth/linked-accounts', {
    method: 'POST',
    body: {
      identifier,
      password,
      refreshToken,
      devicePlatform: currentDevicePlatform(),
      deviceLabel: Device.modelName ?? undefined,
    },
  });
  await adoptSession(res.data);
  const home: HomeAccount = { personId: myId, label: myLabel ?? 'FACULTY', title: 'Faculty' };
  await setSecureItem(HOME_ACCOUNT_KEY, JSON.stringify(home));
  if (res.data.linkedLabel) await setSecureItem(ACTIVE_CLASS_NAME_KEY, res.data.linkedLabel);
  await purgeLegacyStoredAccounts();
  return res.data;
}

/** Switch to an already-linked account: no password, one call. Going OUT remembers where
 * we came from; going BACK clears it. Rejects with ApiError (403) if the link is gone. */
export async function switchLinkedAccount(targetPersonId: string, targetTitle: string): Promise<LoginResult> {
  await getValidAccessToken();
  const [refreshToken, myId, myLabel, home] = await Promise.all([
    getStoredRefreshToken(),
    getActivePersonId(),
    getActiveIdentityLabel(),
    getHomeAccount(),
  ]);
  if (!refreshToken || !myId) throw new AuthExpiredError();
  const res = await authedRequest<{ data: LoginResult }>('/auth/switch', {
    method: 'POST',
    body: { targetPersonId, refreshToken },
  });
  await adoptSession(res.data);
  if (home && home.personId === targetPersonId) {
    // Went back home.
    await deleteSecureItem(HOME_ACCOUNT_KEY);
    await deleteSecureItem(ACTIVE_CLASS_NAME_KEY);
  } else {
    const from: HomeAccount = { personId: myId, label: myLabel ?? 'FACULTY', title: 'Faculty' };
    await setSecureItem(HOME_ACCOUNT_KEY, JSON.stringify(from));
    await setSecureItem(ACTIVE_CLASS_NAME_KEY, targetTitle);
  }
  return res.data;
}

/** e.g. "5-B" while signed into a class account (display only). */
export async function getActiveClassName(): Promise<string | null> {
  return getSecureItem(ACTIVE_CLASS_NAME_KEY);
}

/** My linked phones (for "Linked phones" / remove). */
export async function fetchLinkedPhones(): Promise<LinkedPhone[]> {
  const res = await authedRequest<{ data: LinkedPhone[] }>('/auth/linked-accounts');
  return res.data;
}

export async function removeLinkedPhone(id: string): Promise<void> {
  await authedRequest(`/auth/linked-accounts/${id}`, { method: 'DELETE' });
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
