// Vice Principal Communities module (Phase 19) -- the EXISTING Communities/
// PTA oversight module (communities/community-activities/
// community-memberships/community-announcements controllers), each newly
// (and minimally) broadened to also allow VICE_PRINCIPAL alongside its
// existing PRINCIPAL grant -- see each controller's own comment. Strictly
// read-only: list/get/list-activities/list-memberships/list-announcements
// only. No create/update/archive/record-consent/remove -- every write
// method keeps its own narrower @Roles('ADMIN') (or 'ADMIN','COMMUNITY' for
// announcements) override, unaffected by this grant.
//
// This is NOT the standalone COMMUNITY login/application (community-login,
// community-initiatives, community-proposals, community-membership-requests
// modules) -- none of those were touched, and VP has no access to them
// (all remain @Roles('COMMUNITY') only).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface CommunityRow {
  id: string;
  name: string;
  communityCategory: string;
  description: string | null;
  inchargeStaffId: string | null;
  academicYearId: string;
  maxMembers: number | null;
  discussionEnabled: boolean;
  moderationMode: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityListParams {
  academicYearId?: string;
  state?: string;
}

export async function listCommunities(params: CommunityListParams): Promise<CommunityRow[]> {
  const query = new URLSearchParams();
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.state) query.set('state', params.state);
  const res = await authedRequest<ApiEnvelope<CommunityRow[]>>(`/communities?${query.toString()}`);
  return res.data;
}

export async function getCommunity(id: string): Promise<CommunityRow> {
  const res = await authedRequest<ApiEnvelope<CommunityRow>>(`/communities/${id}`);
  return res.data;
}

export interface CommunityActivityRow {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  venue: string | null;
  status: string;
}

export async function listCommunityActivities(communityId: string): Promise<CommunityActivityRow[]> {
  const res = await authedRequest<ApiEnvelope<CommunityActivityRow[]>>(`/communities/${communityId}/activities`);
  return res.data;
}

export interface CommunityMembershipRow {
  id: string;
  communityId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  roleInCommunity: string;
  parentConsentAt: string | null;
  joinedOn: string;
  status: string;
}

export async function listCommunityMemberships(communityId: string): Promise<CommunityMembershipRow[]> {
  const res = await authedRequest<ApiEnvelope<CommunityMembershipRow[]>>(`/communities/${communityId}/memberships`);
  return res.data;
}

export interface CommunityAnnouncementRow {
  id: string;
  communityId: string;
  title: string;
  body: string;
  attachmentKeys: string[] | null;
  publishedAt: string;
  state: string;
}

export async function listCommunityAnnouncements(communityId: string): Promise<CommunityAnnouncementRow[]> {
  const res = await authedRequest<ApiEnvelope<CommunityAnnouncementRow[]>>(`/communities/${communityId}/announcements`);
  return res.data;
}
