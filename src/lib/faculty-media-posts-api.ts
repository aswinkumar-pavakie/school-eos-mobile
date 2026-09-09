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

export async function listPublishedMediaPosts(): Promise<MediaPost[]> {
  const res = await authedRequest<ApiEnvelope<MediaPost[]>>('/media/posts');
  return res.data;
}
