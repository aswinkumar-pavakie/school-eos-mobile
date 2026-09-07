// Parent app's Fees feature -- real backend calls only (school-eos-backend's
// src/modules/parent), every one going through authedRequest so a stale/expired
// access token is silently refreshed first. No mock/placeholder data anywhere in
// this file -- an empty or loading state is a real "nothing yet", never a filled-in
// fake example.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ParentChild {
  studentId: string;
  studentName: string;
  gradeName: string | null;
  sectionName: string | null;
  mediumName: string | null;
  rollNo: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  accessLevel: 'FULL' | 'VIEW_ONLY' | 'NO_FINANCE';
}

export async function listChildren(): Promise<ParentChild[]> {
  const res = await authedRequest<ApiEnvelope<ParentChild[]>>('/parent/children');
  return res.data;
}

export interface FeeTerm {
  academicYearId: string;
  academicYearName: string;
  instalmentNo: number;
  label: string;
}

export async function listFeeTerms(studentId: string): Promise<FeeTerm[]> {
  const res = await authedRequest<ApiEnvelope<FeeTerm[]>>(`/parent/students/${studentId}/fee-terms`);
  return res.data;
}

export type FeeLineState = 'PENDING' | 'PARTIAL' | 'PAID' | 'WAIVED' | 'OVERDUE' | 'CANCELLED';

export interface FeeLine {
  feeDemandId: string;
  feeHeadName: string;
  amountPaise: string;
  lateFeePaise: string;
  paidPaise: string;
  outstandingPaise: string;
  dueDate: string;
  state: FeeLineState;
}

export interface FeeSummary {
  canPay: boolean;
  totalPayablePaise: string;
  paidPaise: string;
  outstandingPaise: string;
  lines: FeeLine[];
}

export async function getFeeSummary(studentId: string, academicYearId: string, instalmentNo: number): Promise<FeeSummary> {
  const qs = new URLSearchParams({ academicYearId, instalmentNo: String(instalmentNo) });
  const res = await authedRequest<ApiEnvelope<FeeSummary>>(`/parent/students/${studentId}/fees?${qs.toString()}`);
  return res.data;
}

export interface RazorpayOrderResult {
  paymentId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: string;
  schoolName: string;
}

export async function createRazorpayOrder(
  studentId: string,
  input: { academicYearId: string; instalmentNo: number; feeDemandIds: string[]; amountPaise: string },
): Promise<RazorpayOrderResult> {
  const res = await authedRequest<ApiEnvelope<RazorpayOrderResult>>(`/parent/students/${studentId}/fees/razorpay-order`, {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export type PaymentState = 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RECONCILED' | 'REVERSED';
export type PaymentMode = 'UPI' | 'CARD' | 'NETBANKING' | 'CASH' | 'CHEQUE' | 'DD' | 'WALLET_TOPUP';

export interface PaymentHistoryItem {
  id: string;
  amountPaise: string;
  mode: PaymentMode;
  gateway: string | null;
  gatewayRef: string | null;
  state: PaymentState;
  initiatedAt: string;
  confirmedAt: string | null;
  receiptId: string | null;
  receiptNo: string | null;
  receiptCount: number;
}

export async function listPayments(studentId: string): Promise<PaymentHistoryItem[]> {
  const res = await authedRequest<ApiEnvelope<PaymentHistoryItem[]>>(`/parent/students/${studentId}/payments`);
  return res.data;
}

export interface ReceiptLineItem {
  feeHeadId: string | null;
  feeHeadName: string | null;
  instalmentNo: number;
  amountPaise: string;
}

export interface ReceiptDetail {
  receipt: {
    id: string;
    receiptNo: string;
    financialYear: string;
    amountPaise: string;
    issuedOn: string;
  };
  payment: {
    mode: PaymentMode;
    gateway: string | null;
    gatewayRef: string | null;
    initiatedAt: string;
    confirmedAt: string | null;
  };
  student: {
    displayName: string;
    admissionNo: string;
    gradeName: string | null;
    sectionName: string | null;
  } | null;
  lineItems: ReceiptLineItem[];
  school: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    board: string | null;
    recognitionNo: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  } | null;
}

export async function getReceipt(receiptId: string): Promise<ReceiptDetail> {
  const res = await authedRequest<ApiEnvelope<ReceiptDetail>>(`/parent/receipts/${receiptId}`);
  return res.data;
}
