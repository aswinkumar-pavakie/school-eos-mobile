// Thin typed wrappers over the 6 verified messaging endpoints. Every call goes
// through authedRequest (src/lib/auth.ts) -- no separate HTTP client, no
// client-side authorization, no sender/recipient id ever sent from here (the
// backend derives sender from the JWT; there is no field for it in these bodies).

import * as Crypto from 'expo-crypto';
import { authedRequest } from '@/lib/auth';
import type {
  ConversationDetail,
  ConversationSummary,
  FacultyDirectoryEntry,
  Message,
  MessagesPage,
  StudentDirectoryEntry,
  TranslateMessageResult,
} from './types';

interface Envelope<T> {
  data: T;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await authedRequest<Envelope<ConversationSummary[]>>('/messages/conversations');
  return res.data;
}

export async function fetchConversationDetail(id: string): Promise<ConversationDetail> {
  const res = await authedRequest<Envelope<ConversationDetail>>(`/messages/conversations/${id}`);
  return res.data;
}

export async function fetchMessages(id: string, before?: string): Promise<MessagesPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await authedRequest<{ data: Message[]; meta: MessagesPage['meta'] }>(
    `/messages/conversations/${id}/messages${query}`,
  );
  return { items: res.data, meta: res.meta };
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
  const idempotencyKey = Crypto.randomUUID();
  const res = await authedRequest<Envelope<Message>>(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { message: text },
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await authedRequest(`/messages/conversations/${conversationId}/read`, { method: 'PATCH' });
}

export async function translateMessage(
  conversationId: string,
  messageId: string,
  targetLanguage: string,
): Promise<TranslateMessageResult> {
  const res = await authedRequest<Envelope<TranslateMessageResult>>(
    `/messages/conversations/${conversationId}/messages/${messageId}/translate`,
    { method: 'POST', body: { targetLanguage } },
  );
  return res.data;
}

// ---- Principal: start a new conversation, search directories -------------------
// Principal-only server-side (RolesGuard rejects anyone else before these
// handlers run) -- these calls simply aren't reachable from a Faculty/Parent
// login, so no client-side role gate is needed here beyond not showing the
// entry points to them (see MessagesListScreen/new-message screens).

export async function startFacultyConversation(facultyPersonId: string): Promise<ConversationSummary> {
  const res = await authedRequest<Envelope<ConversationSummary>>('/messages/principal/conversations/faculty', {
    method: 'POST',
    body: { facultyPersonId },
  });
  return res.data;
}

/** Fans out to every currently ACTIVE guardian at once server-side -- this can
 * return more than one conversation for a student with more than one guardian. */
export async function startStudentConversation(studentId: string): Promise<ConversationSummary[]> {
  const res = await authedRequest<Envelope<ConversationSummary[]>>('/messages/principal/conversations/student', {
    method: 'POST',
    body: { studentId },
  });
  return res.data;
}

export async function searchFacultyDirectory(search: string): Promise<FacultyDirectoryEntry[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await authedRequest<{ data: FacultyDirectoryEntry[] }>(`/messages/principal/faculty/search${query}`);
  return res.data;
}

export async function searchStudentDirectory(search: string): Promise<StudentDirectoryEntry[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await authedRequest<{ data: StudentDirectoryEntry[] }>(`/messages/principal/students/search${query}`);
  return res.data;
}
