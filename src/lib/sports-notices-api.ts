// Sports Admin's own Notice screen -- real GET/POST /announcements, same
// real school-wide announcement system every other role's own Notices
// screen uses (see principal-announcements-api.ts's own precedent),
// broadened for SPORTS_ADMIN this same phase. Reads SCHOOL-wide +
// ROLE=SPORTS_ADMIN announcements; posts always use a real audienceType
// (SCHOOL or ROLE/targetRoles=['SPORTS_ADMIN']) -- this system has no
// concept of a per-squad audience, so the design's own "target a specific
// squad" idea isn't fabricated here.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isEmergency: boolean;
  audienceType: 'SCHOOL' | 'ROLE' | 'SECTION';
  createdByName: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export async function listSportsNotices(): Promise<AnnouncementRow[]> {
  // roleCode=SPORTS_ADMIN alone already returns SCHOOL-wide + role-specific
  // announcements together (AnnouncementQueryDto's own documented behaviour).
  const res = await authedRequest<ApiEnvelope<AnnouncementRow[]>>('/announcements?roleCode=SPORTS_ADMIN');
  return [...res.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function postSportsNotice(input: { title: string; body: string; audience: 'SCHOOL' | 'SPORTS_ADMIN' }): Promise<AnnouncementRow> {
  const res = await authedRequest<ApiEnvelope<AnnouncementRow>>('/announcements', {
    method: 'POST',
    body: {
      title: input.title,
      body: input.body,
      priority: 'NORMAL',
      audienceType: input.audience === 'SCHOOL' ? 'SCHOOL' : 'ROLE',
      targetRoles: input.audience === 'SCHOOL' ? undefined : ['SPORTS_ADMIN'],
    },
  });
  return res.data;
}
