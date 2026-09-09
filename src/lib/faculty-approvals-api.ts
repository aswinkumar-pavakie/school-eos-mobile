// Generic approvals engine client -- every approval-routed Faculty feature
// (Student Leave, Employee Leave & OD, HR Payroll, Appraisal) decides through
// these same two real endpoints (school-eos-backend's approvals.controller).
// sendBackRequest added (Vice Principal Requests & Approvals, Phase 23) for
// the same controller's third real decision endpoint -- reused here rather
// than duplicated in a VP-only file, same engine, same authorization.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export async function approveRequest(approvalRequestId: string, comment?: string): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>(`/approvals/${approvalRequestId}/approve`, { method: 'POST', body: { comment } });
}

export async function rejectRequest(approvalRequestId: string, comment?: string): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>(`/approvals/${approvalRequestId}/reject`, { method: 'POST', body: { comment } });
}

/** Comment is required server-side (SendBackApprovalDto) -- same "decision
 * requires a reason" rule as reject. */
export async function sendBackRequest(approvalRequestId: string, comment: string): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>(`/approvals/${approvalRequestId}/send-back`, { method: 'POST', body: { comment } });
}

/** withdrawRequest added (Principal Requests & Approvals) for the engine's
 * fourth real action -- the REQUESTER'S OWN still-open request only
 * (enforced server-side: ApprovalsService.withdraw checks requestedBy ===
 * actor.personId), same engine, same authorization, reused here rather than
 * duplicated in a Principal-only file. */
export async function withdrawRequest(approvalRequestId: string): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>(`/approvals/${approvalRequestId}/withdraw`, { method: 'POST' });
}
