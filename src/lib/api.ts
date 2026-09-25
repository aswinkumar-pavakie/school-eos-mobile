// Low-level HTTP client: base URL + JSON in/out + typed errors. No auth awareness --
// that's lib/auth.ts's job, built on top of apiRequest exported here. Keeping the
// direction one-way (auth.ts -> api.ts) avoids a circular import between the two.

import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { getDeviceId } from './device-id';

// EXPO_PUBLIC_API_BASE_URL (see .env.example) is wired into app.config.ts's `extra`
// block and read back out via expo-constants here -- the project's existing
// convention for public runtime config, so this reuses it rather than introducing a
// second, differently-named env var for the same value.
const RAW_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? 'http://localhost:3000';

export const API_BASE_URL = `${RAW_BASE_URL.replace(/\/$/, '')}/api/v1`;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

/** Unauthenticated request against the backend. Throws ApiError with the backend's
 * own `message` on any non-2xx response, so callers can render it verbatim. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  // A real FormData body (the digital-signature upload is the one caller that
  // needs this -- see permission-requests-api.ts) must NOT be JSON.stringify'd
  // (that would serialize it to the useless string "[object FormData]") and
  // must NOT get an explicit Content-Type: fetch sets multipart/form-data with
  // the correct boundary itself only when Content-Type is left unset.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  const deviceId = await getDeviceId();
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: isFormData
        ? { 'X-Device-Id': deviceId, ...headers }
        : { 'Content-Type': 'application/json', 'X-Device-Id': deviceId, ...headers },
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // TEMPORARY diagnostic detail (dev-only) -- surfaces the real fetch failure
    // reason and target URL on-screen instead of a generic message, to find why
    // "Unable to reach the server" kept recurring despite the backend/network
    // being independently confirmed reachable. Revert to the generic message
    // once root-caused.
    const detail = __DEV__ ? ` [${API_BASE_URL}${path}] ${err instanceof Error ? err.message : String(err)}` : '';
    // Distinguish "this device has no connectivity at all" from "the fetch
    // itself failed for some other reason" (server unreachable, TLS error,
    // etc.) -- previously both looked identical to the user. NetInfo.fetch()
    // is a quick, already-installed, previously-unused check (no new
    // dependency), not a broad offline-mode feature.
    const netState = await NetInfo.fetch().catch(() => null);
    const isOffline = netState !== null && netState.isConnected === false;
    const message = isOffline
      ? 'No internet connection. Check your connection and try again.'
      : `Unable to reach the server. Please try again.${detail}`;
    throw new ApiError(0, message);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? 'Something went wrong. Please try again.');
  }

  return json as T;
}

/** Centralizes the `err instanceof ApiError ? err.message : '<fallback>'`
 * idiom already duplicated 67+ times across the app (Alert.alert bodies,
 * ErrorState messages) -- same displayed output for every existing case,
 * just one place to read/change it instead of many. `fallback` covers a
 * non-ApiError throw (a genuinely unexpected error, not a normal API/network
 * failure -- those always come back as ApiError already). */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return err instanceof ApiError ? err.message : fallback;
}
