// Hostel Warden's own Home dashboard -- real GET /announcements, same real
// school-wide announcement system every other role's own Notices screen
// uses (see sports-notices-api.ts's own precedent), broadened for
// HOSTEL_WARDEN this same phase. Read-only -- the design's own "All
// notices" screen has no compose action, so no post function is exported
// here.

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

export async function listWardenNotices(): Promise<AnnouncementRow[]> {
  const res = await authedRequest<ApiEnvelope<AnnouncementRow[]>>('/announcements?roleCode=HOSTEL_WARDEN');
  return [...res.data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
