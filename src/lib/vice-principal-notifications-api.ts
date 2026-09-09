// Vice Principal Notifications module (Phase 24) -- the first-ever read
// access to the `notification` table anywhere in this app. The table itself,
// and every notification row in it, already existed -- written by the
// existing, untouched OutboxService (approvals decisions, community
// announcements, repair requests, attendance-absence alerts, etc. all
// already enqueue real rows there) -- but nothing in the whole backend has
// ever read it back, for any role. This adds the missing GET/mark-read half
// of that already-decided design, not a new notification engine: no new
// notification_type was invented, no new targeting logic was added, and
// OutboxService's own decision of WHEN to notify whom is completely
// untouched.
//
// GET /notifications and POST /notifications/:id/read carry NO role
// restriction on the backend -- notifications are inherently personal
// (notification.person_id), so the real authorization is
// personId === authenticated actor's own personId, enforced server-side,
// never a role check and never a client-supplied id. This is the exact same
// "no @Roles(), self-scoped by the authenticated session" pattern the
// generic approvals engine (/approvals) already uses.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number; unreadCount: number };
}

export interface NotificationRow {
  id: string;
  personId: string;
  aboutStudentId: string | null;
  notificationType: string;
  title: string;
  body: string;
  relatedObjectType: string | null;
  relatedObjectId: string | null;
  deepLink: string | null;
  isEmergency: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListParams {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export async function listNotifications(
  params: NotificationListParams,
): Promise<{ data: NotificationRow[]; meta: { page: number; limit: number; total: number; unreadCount: number } }> {
  const query = new URLSearchParams();
  if (params.unreadOnly) query.set('unreadOnly', 'true');
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<NotificationRow[]>>(`/notifications?${query.toString()}`);
}

export async function markNotificationRead(id: string): Promise<NotificationRow> {
  const res = await authedRequest<ApiEnvelope<NotificationRow>>(`/notifications/${id}/read`, { method: 'POST' });
  return res.data;
}
