// Appraisal -- real backend calls only (faculty/appraisal controller).
// Single-step Principal review (out of scope) -- state flips SUBMITTED ->
// REVIEWED once decided.

import { authedRequest } from './auth';
import type { ApprovalStepSummary } from './faculty-approval-trail';

interface ApiEnvelope<T> {
  data: T;
}

export interface StaffAppraisal {
  id: string;
  staffId: string;
  cycle: string;
  selfAssessment: string;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  score: number | null;
  principalRemark: string | null;
  state: 'SUBMITTED' | 'REVIEWED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  approvalRequestId: string | null;
  approvalTrail: ApprovalStepSummary[];
}

export async function listAppraisals(): Promise<StaffAppraisal[]> {
  const res = await authedRequest<ApiEnvelope<StaffAppraisal[]>>('/faculty/appraisal');
  return res.data;
}

export async function createAppraisal(input: { cycle: string; selfAssessment: string }): Promise<StaffAppraisal> {
  const res = await authedRequest<ApiEnvelope<StaffAppraisal>>('/faculty/appraisal', { method: 'POST', body: input });
  return res.data;
}
