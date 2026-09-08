// Generic approvals engine client -- every approval-routed Faculty feature
// (Student Leave, Employee Leave & OD, HR Payroll, Appraisal) decides through
// these same two real endpoints (school-eos-backend's approvals.controller).

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
