// Vice Principal My Leave (Phase 28) -- the authenticated VP's OWN leave
// requests only. Backed by GET/POST /staff/me/leave-requests and
// POST /staff/me/leave-requests/:id/withdraw -- all self-scoped server-side
// (staffId resolved from the caller's own personId, never client-supplied).
//
// This restores a REAL, previously-unwired feature: the staff_leave_request
// table and its STAFF_LEAVE_REQUEST approval_policy (single step,
// PRINCIPAL) already existed with real historical data before this phase --
// only the controller/service layer connecting them was missing. Creation
// routes through the same generic approvals engine every other approval-
// integrated feature in this app already uses; withdrawal reuses that
// engine's own existing POST /approvals/:id/withdraw unchanged. No new
// leave engine, no new approval engine, no VP-specific table.
//
// Note: the existing Faculty "Employee Leave & OD" screen
// (faculty-staff-leave-api.ts) references this SAME real
// GET/POST /faculty/staff-leave shape but at a route that was never
// actually wired to a controller either -- that pre-existing Faculty-side
// gap was not touched here (out of this phase's scope); this module's own
// routes are the ones now real and working.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export type StaffLeaveType = 'CASUAL' | 'MEDICAL' | 'EARNED' | 'ON_DUTY';

export interface MyLeaveRequest {
  id: string;
  staffId: string;
  leaveType: StaffLeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  state: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvalRequestId: string | null;
  approvalState: string | null;
}

export interface ApprovalStepInfo {
  sequenceNo: number;
  approverRoleCode: string;
  decision: string | null;
  comment: string | null;
  decidedAt: string | null;
}

export interface MyLeaveRequestDetail extends MyLeaveRequest {
  approvalSteps: ApprovalStepInfo[];
}

export async function listMyLeaveRequests(): Promise<MyLeaveRequest[]> {
  const res = await authedRequest<ApiEnvelope<MyLeaveRequest[]>>('/staff/me/leave-requests');
  return res.data;
}

export async function getMyLeaveRequest(id: string): Promise<MyLeaveRequestDetail> {
  const res = await authedRequest<ApiEnvelope<MyLeaveRequestDetail>>(`/staff/me/leave-requests/${id}`);
  return res.data;
}

export interface CreateMyLeaveInput {
  leaveType: StaffLeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
}

export async function createMyLeaveRequest(input: CreateMyLeaveInput): Promise<MyLeaveRequest> {
  const res = await authedRequest<ApiEnvelope<MyLeaveRequest>>('/staff/me/leave-requests', { method: 'POST', body: input });
  return res.data;
}

export async function withdrawMyLeaveRequest(id: string): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>(`/staff/me/leave-requests/${id}/withdraw`, { method: 'POST' });
}
