// Low-level HTTP client: base URL + JSON in/out + typed errors. No auth awareness --
// that's lib/auth.ts's job, built on top of apiRequest exported here. Keeping the
// direction one-way (auth.ts -> api.ts) avoids a circular import between the two.

import Constants from 'expo-constants';

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Check your connection.');
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, json?.message ?? 'Something went wrong. Please try again.');
  }

  return json as T;
}
