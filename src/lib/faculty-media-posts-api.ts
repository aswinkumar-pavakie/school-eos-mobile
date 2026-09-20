// Home feed's Media Room connection -- real backend calls only (media/posts
// controller, widened for FACULTY callers -- always forced to
// state=PUBLISHED server-side, see media-posts.controller.ts's own note).
// Building the posts-consumption feature itself is out of scope here; this
// is only the read connection the Faculty Home screen needs.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface MediaPostAsset {
  id: string;
  objectKey: string;
  url: string;
  mediaType: string;
  sortOrder: number;
}

export interface MediaPost {
  id: string;
  format: string;
  category: string;
  caption: string;
  firstComment: string | null;
  linkUrl: string | null;
  state: string;
  publishedAt: string | null;
  createdAt: string;
  assets: MediaPostAsset[];
}

// Explicitly requests state=PUBLISHED even though the backend already
// forces this for FACULTY/PARENT/SPORTS_ADMIN/HOSTEL_WARDEN callers --
// PRINCIPAL and CORRESPONDENT are "privileged" there (full Media Room
// oversight elsewhere in the app) and would otherwise silently get drafts/
// scheduled/cancelled posts mixed into a Home feed that must only ever show
// what's actually live. Never omit this query param.
export async function listPublishedMediaPosts(): Promise<MediaPost[]> {
  const res = await authedRequest<ApiEnvelope<MediaPost[]>>('/media/posts?state=PUBLISHED');
  return res.data;
}
