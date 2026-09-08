// Vice Principal Finance module (Phase 18) -- read-only school-level oversight
// ONLY, via the SAME 5 controllers already granted to Principal
// (AdminFinanceModule: fee-overview, fee-demands, fee-heads, fee-structures,
// payments), each newly (and minimally) broadened to also allow
// VICE_PRINCIPAL -- see each controller's own comment. This module's own doc
// comment states it plainly: "No controller here ever exposes a
// POST/PATCH/DELETE" -- collection, refunds, adjustments, reconciliation,
// fee-structure/fee-head configuration, and expenses/concessions/purchase
// requests all stay on the separate, unrelated FinanceModule (FINANCE/ADMIN
// only, never touched by this phase). VP gets exactly Principal's oversight
// tier, nothing more.
//
// gatewayRef is deliberately never rendered from the payments list --
// internal payment-processor reference, out of scope for oversight, same
// field-level exclusion pattern as every prior phase's own financial fields.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface FeeOverview {
  totalFeesPaise: string;
  totalCollectedPaise: string;
  totalPendingPaise: string;
  totalOutstandingPaise: string;
  totalOverduePaise: string;
  studentsWithPendingCount: number;
  studentsWithOverdueCount: number;
}

export async function getFeeOverview(academicYearId?: string): Promise<FeeOverview> {
  const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
  const res = await authedRequest<ApiEnvelope<FeeOverview>>(`/fee-overview${query}`);
  return res.data;
}

export interface FeeDemandRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  academicYearName: string;
  feeHeadName: string | null;
  amountPaise: string;
  lateFeePaise: string;
  paidPaise: string;
  pendingPaise: string;
  dueDate: string;
  state: string;
}

export interface FeeDemandListParams {
  academicYearId?: string;
  gradeId?: string;
  sectionId?: string;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listFeeDemands(
  params: FeeDemandListParams,
): Promise<{ data: FeeDemandRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.gradeId) query.set('gradeId', params.gradeId);
  if (params.sectionId) query.set('sectionId', params.sectionId);
  if (params.state) query.set('state', params.state);
  if (params.search) query.set('search', params.search);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<FeeDemandRow[]>>(`/fee-demands?${query.toString()}`);
}

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  headType: string;
  isRefundable: boolean;
  status: string;
  activeStructureCount: number;
  totalConfiguredPaise: string | null;
}

export async function listFeeHeads(): Promise<FeeHead[]> {
  const res = await authedRequest<ApiEnvelope<FeeHead[]>>('/fee-heads');
  return res.data;
}

export interface FeeStructureRow {
  id: string;
  academicYearId: string;
  gradeId: string;
  mediumId: string | null;
  category: string | null;
  totalPaise: string;
  state: string;
}

export interface FeeStructureListParams {
  academicYearId?: string;
  gradeId?: string;
  state?: string;
}

export async function listFeeStructures(params: FeeStructureListParams): Promise<FeeStructureRow[]> {
  const query = new URLSearchParams();
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.gradeId) query.set('gradeId', params.gradeId);
  if (params.state) query.set('state', params.state);
  const res = await authedRequest<ApiEnvelope<FeeStructureRow[]>>(`/fee-structures?${query.toString()}`);
  return res.data;
}

export interface FeeStructureLine {
  id: string;
  feeStructureId: string;
  feeHeadId: string;
  amountPaise: string;
  instalmentNo: number;
  dueDate: string;
  lateFeePaise: string;
}

export interface FeeStructureDetail extends FeeStructureRow {
  lines: FeeStructureLine[];
}

export async function getFeeStructure(id: string): Promise<FeeStructureDetail> {
  const res = await authedRequest<ApiEnvelope<FeeStructureDetail>>(`/fee-structures/${id}`);
  return res.data;
}

export interface PaymentRow {
  id: string;
  studentId: string | null;
  studentFirstName: string | null;
  studentLastName: string | null;
  admissionNo: string | null;
  amountPaise: string;
  mode: string;
  state: string;
  initiatedAt: string;
  confirmedAt: string | null;
  receiptNo: string | null;
  issuedOn: string | null;
  collectedByName: string | null;
}

export interface PaymentListParams {
  search?: string;
  state?: string;
  mode?: string;
  academicYearId?: string;
  page?: number;
  limit?: number;
}

export async function listPayments(
  params: PaymentListParams,
): Promise<{ data: PaymentRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.state) query.set('state', params.state);
  if (params.mode) query.set('mode', params.mode);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<PaymentRow[]>>(`/payments?${query.toString()}`);
}
