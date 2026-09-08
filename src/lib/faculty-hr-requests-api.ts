// HR Payroll request -- real backend calls only (faculty/hr-requests
// controller). Two-step Principal -> Finance approval (both out of scope);
// state only flips APPROVED once Finance's own final step decides.

import { authedRequest } from './auth';
import type { ApprovalStepSummary } from './faculty-approval-trail';

interface ApiEnvelope<T> {
  data: T;
}

export type HrRequestCategory = 'SALARY_QUERY' | 'PF_ESI' | 'INCOME_TAX_DECLARATION' | 'INCREMENT_ARREARS' | 'BANK_ACCOUNT_CHANGE' | 'SERVICE_CERTIFICATE';

export const HR_CATEGORY_LABELS: Record<HrRequestCategory, string> = {
  SALARY_QUERY: 'Salary query',
  PF_ESI: 'PF / ESI',
  INCOME_TAX_DECLARATION: 'Income tax declaration',
  INCREMENT_ARREARS: 'Increment / arrears',
  BANK_ACCOUNT_CHANGE: 'Bank account change',
  SERVICE_CERTIFICATE: 'Service certificate',
};

export interface StaffHrRequest {
  id: string;
  staffId: string;
  category: HrRequestCategory;
  subject: string;
  description: string | null;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequestId: string | null;
  createdAt: string;
  approvalTrail: ApprovalStepSummary[];
}

export async function listHrRequests(): Promise<StaffHrRequest[]> {
  const res = await authedRequest<ApiEnvelope<StaffHrRequest[]>>('/faculty/hr-requests');
  return res.data;
}

export async function createHrRequest(input: { category: HrRequestCategory; subject: string; description?: string }): Promise<StaffHrRequest> {
  const res = await authedRequest<ApiEnvelope<StaffHrRequest>>('/faculty/hr-requests', { method: 'POST', body: input });
  return res.data;
}
