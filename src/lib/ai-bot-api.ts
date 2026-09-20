// Low-level client for the separate AI assistant bot service
// (school-eos-ai-bot). Unlike messaging-api.ts, this app calls the bot
// DIRECTLY -- no same-origin proxy needed, since this app already holds its
// own access token client-side (secure storage), unlike the website's
// browser JS which can't read an httpOnly cookie. No separate login for
// this feature: reuses getValidAccessToken() from ./auth exactly like every
// other authenticated call in this app.
//
// The bot's own contract: POST /api/chat, body
// { accessToken, question, conversationId }, response
// { answer, conversationId, category? }. The access token goes in the JSON
// BODY, not an Authorization header -- the bot forwards it straight through
// to the real backend itself.

import Constants from 'expo-constants';
import { AuthExpiredError, getValidAccessToken, refreshTokens } from './auth';

const RAW_AI_BOT_BASE_URL =
  (Constants.expoConfig?.extra?.aiBotBaseUrl as string | undefined) ?? 'http://localhost:8000';

export const AI_BOT_BASE_URL = RAW_AI_BOT_BASE_URL.replace(/\/$/, '');

export class AiBotError extends Error {
  readonly status: number;
  /** Present only for a 429 -- seconds the caller should wait before retrying. */
  readonly retryAfterSeconds: number | undefined;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'AiBotError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Thrown only when fetch() itself throws (network/DNS/connection failure) --
 * never for a real HTTP response, even an error one. Distinct from AiBotError
 * so callers can show "could not reach the assistant" vs a real bot-side error. */
export class AiBotUnreachableError extends Error {
  constructor() {
    super('Could not reach the assistant. Please try again shortly.');
    this.name = 'AiBotUnreachableError';
  }
}

// The tunnel exposing this bot drops and reconnects periodically (10-40s
// gaps) -- retries ONLY when fetch() itself throws, never on a real HTTP
// response (even an error one, like a 429, which is a legitimate answer to
// surface, not retry).
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3, delayMs = 4000): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export interface AskAssistantResult {
  answer: string;
  conversationId: string;
  category?: 'SCHOOL' | 'NORMAL';
}

async function callBot(accessToken: string, question: string, conversationId: string | null): Promise<Response> {
  return fetchWithRetry(`${AI_BOT_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Harmless no-op against a non-ngrok tunnel, needed if it's ever an
      // ngrok one again.
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ accessToken, question, conversationId }),
  });
}

/** Asks the assistant a question, reusing this app's own signed-in session.
 * On a 401 (token invalid/expired by the time the bot's forwarded call
 * reached the real backend), refreshes the token once and retries once,
 * mirroring authedRequest's own 401-retry-once pattern. Throws AiBotError
 * for a real HTTP error response (with retryAfterSeconds set for a 429), or
 * AiBotUnreachableError if fetch() itself failed after retries. */
export async function askAssistant(question: string, conversationId: string | null): Promise<AskAssistantResult> {
  const accessToken = await getValidAccessToken();

  let res: Response;
  try {
    res = await callBot(accessToken, question, conversationId);
  } catch {
    throw new AiBotUnreachableError();
  }

  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed) throw new AuthExpiredError();
    try {
      res = await callBot(refreshed.accessToken, question, conversationId);
    } catch {
      throw new AiBotUnreachableError();
    }
  }

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new AiBotError(429, 'The assistant is busy right now.', Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.answer) {
    throw new AiBotError(res.status, body?.message ?? 'The assistant could not answer that. Please try again.');
  }

  return body as AskAssistantResult;
}
