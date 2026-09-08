// Payslip -- real backend calls only (faculty/payslip controller). Gated by
// its own request: Principal then Finance must both approve (reusing HR
// Payroll's own two-step chain, category='PAYSLIP_REQUEST') before any real
// payslip data is reachable -- a one-time clearance, not a fresh request
// every period.

import { authedRequest } from './auth';
import type { ApprovalStepSummary } from './faculty-approval-trail';

interface ApiEnvelope<T> {
  data: T;
}

export interface Payslip {
  id: string;
  payrollPeriodId: string;
  month: number;
  year: number;
  grossPaise: string;
  deductionsPaise: string;
  netPaise: string;
  breakdown: Record<string, number> | null;
  pdfObjectKey: string | null;
}

export interface PayslipAccessRequest {
  id: string;
  category: string;
  subject: string;
  description: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequestId: string | null;
  createdAt: string;
  approvalTrail: ApprovalStepSummary[];
}

export interface PayslipRequestStatus {
  requests: PayslipAccessRequest[];
  hasAccess: boolean;
}

export async function getPayslipRequestStatus(): Promise<PayslipRequestStatus> {
  const res = await authedRequest<ApiEnvelope<PayslipRequestStatus>>('/faculty/payslip/request-status');
  return res.data;
}

export async function requestPayslipAccess(note?: string): Promise<PayslipAccessRequest> {
  const res = await authedRequest<ApiEnvelope<PayslipAccessRequest>>('/faculty/payslip/request', { method: 'POST', body: { note } });
  return res.data;
}

export async function listPayslips(): Promise<Payslip[]> {
  const res = await authedRequest<ApiEnvelope<Payslip[]>>('/faculty/payslip');
  return res.data;
}
