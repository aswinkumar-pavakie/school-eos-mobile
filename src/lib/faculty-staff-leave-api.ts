// Employee Leave & OD -- real backend calls only (faculty/staff-leave
// controller). OD is leave_type='ON_DUTY' on the same real table. Deciding
// (Principal) goes through the generic approvals endpoints.

import { authedRequest } from './auth';
import type { ApprovalStepSummary } from './faculty-approval-trail';

interface ApiEnvelope<T> {
  data: T;
}

export type StaffLeaveType = 'CASUAL' | 'MEDICAL' | 'EARNED' | 'ON_DUTY';

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  leaveType: StaffLeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  approvalRequestId: string | null;
  approvalTrail: ApprovalStepSummary[];
}

export async function listStaffLeaveRequests(): Promise<StaffLeaveRequest[]> {
  const res = await authedRequest<ApiEnvelope<StaffLeaveRequest[]>>('/faculty/staff-leave');
  return res.data;
}

export interface CreateStaffLeaveInput {
  leaveType: StaffLeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
}

export async function createStaffLeaveRequest(input: CreateStaffLeaveInput): Promise<StaffLeaveRequest> {
  const res = await authedRequest<ApiEnvelope<StaffLeaveRequest>>('/faculty/staff-leave', { method: 'POST', body: input });
  return res.data;
}
