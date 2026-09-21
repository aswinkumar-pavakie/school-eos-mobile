// Low-level HTTP client for the separate School EOS Messaging microservice.
// Mirrors src/lib/api.ts's own shape (base URL + JSON in/out + typed errors)
// but talks to a genuinely different service with its own base URL and its
// own error envelope: this backend's HttpExceptions carry a plain
// `{ code: '...' }` body (see MESSAGING_ERRORS in the messaging service's own
// error-codes.ts), not Core's `{ message: '...' }` shape, so the error type
// here exposes `.code` rather than assuming `.message` exists.
//
// Reuses getValidAccessToken() from ./auth directly -- that function has no
// base-URL dependency, so token refresh logic is never duplicated for this
// second backend.

import Constants from 'expo-constants';
import { getValidAccessToken } from './auth';

const RAW_MESSAGING_BASE_URL =
  (Constants.expoConfig?.extra?.messagingApiBaseUrl as string | undefined) ??
  'http://localhost:3001';

export const MESSAGING_API_BASE_URL = `${RAW_MESSAGING_BASE_URL.replace(/\/$/, '')}/v1/messaging`;

export class MessagingApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = 'MessagingApiError';
    this.status = status;
    this.code = code;
  }
}

export interface MessagingApiRequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

/** Authenticated request against the messaging microservice -- always attaches
 * the same access token Core accepts (the messaging service verifies the
 * exact same JWT, it never issues its own). Throws MessagingApiError with the
 * backend's own `code` on any non-2xx response. */
export async function messagingRequest<T>(
  path: string,
  options: MessagingApiRequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const accessToken = await getValidAccessToken();

  let res: Response;
  try {
    res = await fetch(`${MESSAGING_API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new MessagingApiError(
      0,
      undefined,
      'Unable to reach the messaging server. Check your connection.',
    );
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new MessagingApiError(
      res.status,
      json?.code,
      json?.message ?? json?.code ?? 'Something went wrong. Please try again.',
    );
  }

  return json as T;
}

// ---- Discovery -------------------------------------------------------------

export interface DiscoveryItem {
  userId: string;
  displayName: string;
  role: string;
  designation?: string;
  profilePhoto?: string;
  scope: 'SCOPED' | 'UNSCOPED';
  messagingMode: 'DIRECT' | 'REQUEST';
}

export interface DiscoveryResponse {
  data: { items: DiscoveryItem[]; nextCursor: string | null };
}

export function discoverUsers(params: {
  search?: string;
  cursor?: string;
  limit?: number;
}): Promise<DiscoveryResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return messagingRequest<DiscoveryResponse>(
    `/discovery${qs ? `?${qs}` : ''}`,
  );
}

// ---- Conversations -----------------------------------------------------

export interface ConversationSummary {
  id: string;
  status: 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  personAId: string;
  personBId: string;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  /** Base64 MLS Welcome for the calling person, or null if none/already
   * delivered -- see database/migrations/0002_mls.sql's Welcome-delivery
   * contract: NOT cleared by a plain read, only by ackConversationWelcome. */
  mlsWelcome: string | null;
}

export interface ListConversationsResponse {
  data: ConversationSummary[];
  nextCursor: { updatedAt: string; id: string } | null;
}

export function listConversations(cursor?: {
  updatedAt: string;
  id: string;
}): Promise<ListConversationsResponse> {
  const query = new URLSearchParams();
  if (cursor) {
    query.set('cursorUpdatedAt', cursor.updatedAt);
    query.set('cursorId', cursor.id);
  }
  const qs = query.toString();
  return messagingRequest<ListConversationsResponse>(
    `/conversations${qs ? `?${qs}` : ''}`,
  );
}

export function getConversation(
  id: string,
): Promise<{ data: ConversationSummary & { ownLastReadSequence: number } }> {
  return messagingRequest(`/conversations/${id}`);
}

export interface CreateConversationInput {
  targetPersonId: string;
  mlsWelcome?: string;
  initialMessage?: {
    clientMessageId: string;
    ciphertext: string;
    encryptionVersion: string;
    encryptionHeader?: Record<string, unknown>;
  };
}

export interface CreateConversationResult {
  conversationId: string;
  state: 'ACTIVE' | 'PENDING';
  messagingMode: 'DIRECT' | 'REQUEST';
  // False when a conversation with this person already existed -- the
  // server never used this call's mlsWelcome/initialMessage in that case
  // (see hooks.ts's useStartDirectConversation/useCreateRequest).
  isNew: boolean;
}

export function createConversation(
  input: CreateConversationInput,
): Promise<{ data: CreateConversationResult }> {
  return messagingRequest('/conversations', {
    method: 'POST',
    body: input,
  });
}

/** Retry-safe by contract -- call ONLY after joinGroup() succeeded AND the
 * resulting group state was durably persisted locally. See
 * database/migrations/0002_mls.sql. */
export function ackConversationWelcome(
  conversationId: string,
): Promise<{ data: { acknowledged: true } }> {
  return messagingRequest(`/conversations/${conversationId}/mls-welcome/ack`, {
    method: 'POST',
  });
}

// ---- Requests ------------------------------------------------------------

export interface RequestSummary {
  id: string;
  conversationId: string;
  requesterPersonId: string;
  recipientPersonId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  respondedAt: string | null;
}

export function listRequests(params: {
  status?: RequestSummary['status'];
  as?: 'recipient' | 'requester';
}): Promise<{ data: RequestSummary[] }> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.as) query.set('as', params.as);
  const qs = query.toString();
  return messagingRequest(`/requests${qs ? `?${qs}` : ''}`);
}

export interface CreateRequestInput {
  targetPersonId: string;
  mlsWelcome?: string;
  initialMessage: {
    clientMessageId: string;
    ciphertext: string;
    encryptionVersion: string;
    encryptionHeader?: Record<string, unknown>;
  };
}

export function createRequest(
  input: CreateRequestInput,
): Promise<{ data: CreateConversationResult }> {
  return messagingRequest('/requests', { method: 'POST', body: input });
}

export function acceptRequest(id: string): Promise<{ data: RequestSummary }> {
  return messagingRequest(`/requests/${id}/accept`, { method: 'POST' });
}

export function declineRequest(id: string): Promise<{ data: RequestSummary }> {
  return messagingRequest(`/requests/${id}/decline`, { method: 'POST' });
}

export function cancelRequest(id: string): Promise<{ data: RequestSummary }> {
  return messagingRequest(`/requests/${id}/cancel`, { method: 'POST' });
}

// ---- Messages --------------------------------------------------------------

export interface MessageDto {
  id: string;
  conversationId: string;
  senderPersonId: string;
  // The sender's own locally-generated id for this send -- lets the sender's
  // client recognize its own messages and show cached plaintext instead of
  // attempting to decrypt them again (see e2ee/storage.ts's sent-plaintext
  // cache).
  clientMessageId: string;
  sequence: number;
  ciphertext: string;
  encryptionVersion: string;
  encryptionHeader: Record<string, unknown>;
  createdAt: string;
}

export function listMessages(
  conversationId: string,
  params: { before?: number; limit?: number } = {},
): Promise<{ data: MessageDto[]; meta: { hasMore: boolean; nextCursor: number | null } }> {
  const query = new URLSearchParams();
  if (params.before !== undefined) query.set('before', String(params.before));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return messagingRequest(
    `/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
  );
}

export function syncMessages(
  conversationId: string,
  afterSequence: number,
  limit = 200,
): Promise<{ data: MessageDto[] }> {
  const query = new URLSearchParams({
    afterSequence: String(afterSequence),
    limit: String(limit),
  });
  return messagingRequest(
    `/conversations/${conversationId}/sync?${query.toString()}`,
  );
}

export interface SendMessageInput {
  clientMessageId: string;
  ciphertext: string;
  encryptionVersion: string;
  encryptionHeader?: Record<string, unknown>;
}

export function sendMessage(
  conversationId: string,
  input: SendMessageInput,
): Promise<{
  data: {
    clientMessageId: string;
    messageId: string;
    conversationId: string;
    sequence: number;
    status: 'ACCEPTED';
  };
}> {
  return messagingRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: input,
  });
}

export function markRead(
  conversationId: string,
  sequence: number,
): Promise<{ data: { conversationId: string; lastReadSequence: number } }> {
  return messagingRequest(`/conversations/${conversationId}/read`, {
    method: 'POST',
    body: { sequence },
  });
}

// ---- Devices ---------------------------------------------------------------

export interface MessagingDeviceDto {
  id: string;
  personId: string;
  devicePublicKey: string;
  platform: 'ANDROID' | 'IOS';
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
}

export function listMyDevices(): Promise<{ data: MessagingDeviceDto[] }> {
  return messagingRequest('/devices');
}

export function registerDevice(input: {
  devicePublicKey: string;
  platform: 'ANDROID' | 'IOS';
  appVersion?: string;
}): Promise<{ data: MessagingDeviceDto }> {
  return messagingRequest('/devices', { method: 'POST', body: input });
}

// ---- MLS keys ----------------------------------------------------------

export function publishMlsKeyPackages(
  deviceId: string,
  keyPackages: string[],
): Promise<{ data: { ids: string[] } }> {
  return messagingRequest('/keys/mls-key-packages', {
    method: 'POST',
    body: { deviceId, keyPackages },
  });
}

export interface DeviceKeyBundleDto {
  deviceId: string;
  // Only ever populated for the old, now-inert X25519 prekey system --
  // never read by this client, which uses mlsKeyPackage below exclusively.
  identityPublicKey: string | null;
  algorithm: string | null;
  signedPrekey: { publicKey: string; signature: string } | null;
  oneTimePrekey: string | null;
  mlsKeyPackage: { id: string; data: string } | null;
}

export function getKeyBundle(
  userId: string,
): Promise<{ data: DeviceKeyBundleDto[] }> {
  return messagingRequest(`/keys/${userId}`);
}
