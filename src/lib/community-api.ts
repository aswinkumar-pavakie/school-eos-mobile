// Standalone Community app -- real backend calls only (school-eos-backend's
// src/modules/community-proposals, community-initiatives,
// community-membership-requests, and the existing communities/auth modules),
// every one going through authedRequest. Types match the backend's actual
// repository row shapes exactly (verified by reading the backend source and
// live E2E testing against a real dev server this session -- see
// school-eos-website's own community frontend for the identical shapes
// already proven against this same API).
//
// Ownership (which community this login represents) is ALWAYS resolved
// server-side from the caller's own role_assignment row -- never accepted as
// a parameter here, matching the exact same rule the website's own actions.ts
// files follow.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

// ---- Identity ----------------------------------------------------------------------

export interface MeRole {
  role_code: string;
  scope_type: string;
  scope_id: string | null;
}

export interface MeResponse {
  person: { id: string; firstName: string; lastName: string | null; email: string | null };
  roles: MeRole[];
}

export async function getMe(): Promise<MeResponse> {
  const res = await authedRequest<ApiEnvelope<MeResponse>>('/auth/me');
  return res.data;
}

// ---- Community profile (the ONE community this login represents) ------------------

export interface CommunityDetail {
  id: string;
  name: string;
  communityCategory: string;
  description: string | null;
  maxMembers: number | null;
  discussionEnabled: boolean;
  moderationMode: string;
  state: string;
}

export async function getCommunity(communityId: string): Promise<CommunityDetail> {
  const res = await authedRequest<ApiEnvelope<CommunityDetail>>(`/communities/${communityId}`);
  return res.data;
}

export interface MembershipRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  roleInCommunity: string;
  parentConsentAt: string | null;
  joinedOn: string;
  status: string;
}

export async function getCommunityMemberships(communityId: string): Promise<MembershipRow[]> {
  const res = await authedRequest<ApiEnvelope<MembershipRow[]>>(`/communities/${communityId}/memberships`);
  return res.data;
}

// ---- Membership requests (Community proposes add/remove, Principal approves) ------

export interface MembershipRequestRow {
  id: string;
  communityId: string;
  action: 'ADD' | 'REMOVE';
  studentId: string | null;
  studentFirstName: string | null;
  studentLastName: string | null;
  membershipId: string | null;
  roleInCommunity: string | null;
  status: string;
  approvalRequestId: string | null;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listMembershipRequests(): Promise<MembershipRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<MembershipRequestRow[]>>('/community-membership-requests');
  return res.data;
}

export async function requestAddMembership(input: {
  studentId: string;
  roleInCommunity?: 'MEMBER' | 'LEAD';
}): Promise<MembershipRequestRow> {
  const res = await authedRequest<ApiEnvelope<MembershipRequestRow>>('/community-membership-requests/add', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function requestRemoveMembership(membershipId: string): Promise<MembershipRequestRow> {
  const res = await authedRequest<ApiEnvelope<MembershipRequestRow>>('/community-membership-requests/remove', {
    method: 'POST',
    body: { membershipId },
  });
  return res.data;
}

export interface StudentHit {
  id: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
}

export async function searchStudents(search: string): Promise<StudentHit[]> {
  if (search.trim().length < 2) return [];
  const res = await authedRequest<ApiEnvelope<StudentHit[]>>(
    `/community-membership-requests/student-search?search=${encodeURIComponent(search)}`,
  );
  return res.data;
}

// ---- Announcements (Community sends notices to its own community) ----------------

export interface AnnouncementRow {
  id: string;
  communityId: string;
  title: string;
  body: string;
  publishedBy: string;
  publishedAt: string;
  state: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export async function listAnnouncements(communityId: string): Promise<AnnouncementRow[]> {
  const res = await authedRequest<ApiEnvelope<AnnouncementRow[]>>(`/communities/${communityId}/announcements`);
  return res.data;
}

export async function createAnnouncement(
  communityId: string,
  input: { title: string; body: string },
): Promise<AnnouncementRow> {
  const res = await authedRequest<ApiEnvelope<AnnouncementRow>>(`/communities/${communityId}/announcements`, {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function archiveAnnouncement(id: string): Promise<AnnouncementRow> {
  const res = await authedRequest<ApiEnvelope<AnnouncementRow>>(`/community-announcements/${id}`, {
    method: 'PATCH',
    body: { state: 'ARCHIVED' },
  });
  return res.data;
}

// ---- Proposals -----------------------------------------------------------------------

export interface ProposalRow {
  id: string;
  communityId: string;
  communityName: string;
  requestedBy: string;
  title: string;
  description: string;
  status: string;
  approvalRequestId: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listProposals(): Promise<ProposalRow[]> {
  const res = await authedRequest<ApiEnvelope<ProposalRow[]>>('/community-proposals');
  return res.data;
}

export async function getProposal(id: string): Promise<ProposalRow> {
  const res = await authedRequest<ApiEnvelope<ProposalRow>>(`/community-proposals/${id}`);
  return res.data;
}

export async function createProposal(input: { title: string; description: string }): Promise<ProposalRow> {
  const res = await authedRequest<ApiEnvelope<ProposalRow>>('/community-proposals', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function resubmitProposal(
  id: string,
  input: { title?: string; description?: string },
): Promise<ProposalRow> {
  const res = await authedRequest<ApiEnvelope<ProposalRow>>(`/community-proposals/${id}/resubmit`, {
    method: 'POST',
    body: input,
  });
  return res.data;
}

// ---- Approval decision (read-only follow-up -- Principal decides via the web/other clients) --

export interface ApprovalStep {
  approverRoleCode: string;
  decision: string | null;
  comment: string | null;
  decidedAt: string | null;
}

export interface ApprovalDetail {
  request: { state: string };
  steps: ApprovalStep[];
}

export async function getApproval(approvalRequestId: string): Promise<ApprovalDetail> {
  const res = await authedRequest<ApiEnvelope<ApprovalDetail>>(`/approvals/${approvalRequestId}`);
  return res.data;
}

// ---- Activities / Initiatives ---------------------------------------------------------

export interface InitiativeRow {
  id: string;
  communityId: string;
  communityName: string;
  proposalId: string;
  title: string;
  description: string;
  status: string;
  plannedDate: string | null;
  venue: string | null;
  startedAt: string | null;
  completedAt: string | null;
  progressNotes: string | null;
  outcome: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listInitiatives(): Promise<InitiativeRow[]> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow[]>>('/community-initiatives');
  return res.data;
}

export async function getInitiative(id: string): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>(`/community-initiatives/${id}`);
  return res.data;
}

export async function createInitiative(input: {
  proposalId: string;
  plannedDate?: string;
  venue?: string;
}): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>('/community-initiatives', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function updateInitiative(
  id: string,
  input: { title?: string; description?: string; plannedDate?: string; venue?: string },
): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>(`/community-initiatives/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return res.data;
}

export async function startInitiative(id: string): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>(`/community-initiatives/${id}/start`, {
    method: 'POST',
  });
  return res.data;
}

export async function updateInitiativeProgress(id: string, progressNotes: string): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>(`/community-initiatives/${id}/progress`, {
    method: 'PATCH',
    body: { progressNotes },
  });
  return res.data;
}

export async function completeInitiative(id: string, outcome?: string): Promise<InitiativeRow> {
  const res = await authedRequest<ApiEnvelope<InitiativeRow>>(`/community-initiatives/${id}/complete`, {
    method: 'POST',
    body: outcome ? { outcome } : {},
  });
  return res.data;
}
