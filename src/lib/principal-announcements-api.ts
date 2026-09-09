// Principal Announcements module -- listAnnouncements is re-exported
// unchanged (same real GET /announcements list). createAnnouncement is NEW
// and a materially BROADER grant than Vice Principal's: announcements.
// controller.ts's class-level @Roles('ADMIN', 'PRINCIPAL') already covers
// POST /announcements with no method-level override at all -- Principal has
// full create parity with Admin here, confirmed by direct backend audit, not
// assumed from VP's own read-only scope (VP can only list). archive() stays
// @Roles('ADMIN') only -- not given to Principal, confirmed by the same
// audit; not built here.

import { authedRequest } from './auth';

export {
  listAnnouncements,
  type AnnouncementAudience,
  type AnnouncementListParams,
  type AnnouncementRow,
} from './vice-principal-dashboard-api';

interface ApiEnvelope<T> {
  data: T;
}

export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AnnouncementAudienceType = 'SCHOOL' | 'ROLE' | 'SECTION';

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  category?: string;
  priority: AnnouncementPriority;
  isEmergency?: boolean;
  expiresAt?: string;
  audienceType: AnnouncementAudienceType;
  targetRoles?: string[];
  targetSectionIds?: string[];
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<{ id: string }> {
  const res = await authedRequest<ApiEnvelope<{ id: string }>>('/announcements', { method: 'POST', body: input });
  return res.data;
}
