// Announcements -- real backend calls only (faculty/announcements
// controller). Full CRUD, SECTION-audience only (own advisor + teaching
// sections, enforced server-side too).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface AudienceRow {
  audienceType: string;
  targetId: string | null;
  targetStage: string | null;
  targetRole: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string | null;
  priority: string;
  isEmergency: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  approvedBy: string | null;
  state: string;
  createdAt: string;
  audiences: AudienceRow[];
  canEdit: boolean;
}

export async function listFeedAnnouncements(): Promise<Announcement[]> {
  const res = await authedRequest<ApiEnvelope<Announcement[]>>('/faculty/announcements');
  return res.data;
}

export async function listMyAnnouncements(): Promise<Announcement[]> {
  const res = await authedRequest<ApiEnvelope<Announcement[]>>('/faculty/announcements/mine');
  return res.data;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  priority: string;
  targetSectionIds: string[];
  category?: string;
  isEmergency?: boolean;
  expiresAt?: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const res = await authedRequest<ApiEnvelope<Announcement>>('/faculty/announcements', { method: 'POST', body: input });
  return res.data;
}

export async function updateAnnouncement(id: string, input: Partial<CreateAnnouncementInput>): Promise<Announcement> {
  const res = await authedRequest<ApiEnvelope<Announcement>>(`/faculty/announcements/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await authedRequest(`/faculty/announcements/${id}`, { method: 'DELETE' });
}
