// Principal Finance module -- Fee Overview, Fee Demands, Fee Heads, Fee
// Structures, and Payments are re-exported unchanged from the VP module:
// confirmed by direct backend audit that fee-overview.controller.ts,
// fee-demands.controller.ts, fee-heads.controller.ts, fee-structures.
// controller.ts (the bare /fee-structures route), and the bare
// /payments.controller.ts all carry the identical
// @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL') class-level grant, 100%
// read-only for both roles. Principal's own web app happens to browse fee
// structures via a separate, richer /finance/fee-structures route instead,
// but the bare /fee-structures route VP already uses is equally
// Principal-authorized and already proven -- reused rather than duplicated.
//
// Concessions and Expenses are NEW here -- finance/concessions.controller.ts
// and finance/expenses.controller.ts both carry class-level
// @Roles('FINANCE', 'ADMIN', 'PRINCIPAL') (no VICE_PRINCIPAL at all), every
// write method narrowed to @Roles('FINANCE', 'ADMIN') only. Read-only for
// Principal, matching Principal's own real web detail pages (reached only as
// "view underlying record" drill-throughs from a Requests & Approvals
// decision, never a standalone browse feature -- same pattern followed here).
//
// createPurchaseRequest is NEW and Principal-EXCLUSIVE -- confirmed by direct
// backend audit: POST /finance/purchase-requests carries
// @Roles('PRINCIPAL') as its own method-level override (the class default is
// @Roles('FINANCE', 'ADMIN', 'PRINCIPAL') for the list/summary/getById GETs
// only) -- neither FINANCE nor ADMIN can create via this endpoint. This is a
// real, backend-authorized-but-UI-less capability: the web app's own
// finance-api.ts already has a complete, correctly-typed client function for
// it that no page anywhere calls. Building the mobile UI for it is adapting
// an explicitly-authorized existing capability, not inventing one.

import { authedRequest } from './auth';

export {
  getFeeOverview,
  listFeeDemands,
  listFeeHeads,
  listFeeStructures,
  getFeeStructure,
  listPayments,
  type FeeOverview,
  type FeeDemandRow,
  type FeeDemandListParams,
  type FeeHead,
  type FeeStructureRow,
  type FeeStructureListParams,
  type FeeStructureLine,
  type FeeStructureDetail,
  type PaymentRow,
  type PaymentListParams,
} from './vice-principal-finance-api';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { total: number; page: number; pageSize: number };
}

export interface ConcessionRow {
  id: string;
  studentId: string;
  studentDisplayName: string | null;
  studentAdmissionNo: string | null;
  academicYearId: string;
  concessionType: string;
  amountPaise: string | null;
  percent: string | null;
  reason: string;
  approvalRequestId: string | null;
  state: string;
  createdAt: string;
}

export async function getConcession(id: string): Promise<ConcessionRow> {
  const res = await authedRequest<ApiEnvelope<ConcessionRow>>(`/finance/concessions/${id}`);
  return res.data;
}

export interface ExpenseRow {
  id: string;
  categoryId: string;
  amountPaise: string;
  incurredOn: string;
  vendorName: string | null;
  description: string | null;
  recordedBy: string | null;
  approvalRequestId: string | null;
  state: string;
  createdAt: string;
}

export async function getExpense(id: string): Promise<ExpenseRow> {
  const res = await authedRequest<ApiEnvelope<ExpenseRow>>(`/finance/expenses/${id}`);
  return res.data;
}

export type PurchaseRequestType = 'GOODS' | 'SERVICE';

export interface CreatePurchaseRequestInput {
  requestType: PurchaseRequestType;
  itemName: string;
  description?: string;
  quantity?: number;
  vendorName?: string;
  estimatedAmountPaise?: string;
  neededBy?: string;
  departmentId?: string;
}

export interface PurchaseRequestRow {
  id: string;
  requestType: PurchaseRequestType;
  itemName: string;
  state: string;
  createdAt: string;
}

/** Principal-exclusive write -- @Roles('PRINCIPAL') on this one method only,
 * confirmed by direct backend audit. Routes through the same generic
 * approvals engine every other approval-integrated feature in this app
 * already uses -- no new approval engine. */
export async function createPurchaseRequest(input: CreatePurchaseRequestInput): Promise<PurchaseRequestRow> {
  const res = await authedRequest<ApiEnvelope<PurchaseRequestRow>>('/finance/purchase-requests', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export interface ListPurchaseRequestsParams {
  state?: string;
  page?: number;
  pageSize?: number;
}

export async function listMyPurchaseRequests(
  params?: ListPurchaseRequestsParams,
): Promise<{ data: PurchaseRequestRow[]; meta: { total: number; page: number; pageSize: number } }> {
  const query = new URLSearchParams();
  if (params?.state) query.set('state', params.state);
  query.set('page', String(params?.page ?? 1));
  query.set('pageSize', String(params?.pageSize ?? 20));
  return authedRequest<PagedEnvelope<PurchaseRequestRow[]>>(`/finance/purchase-requests?${query.toString()}`);
}
