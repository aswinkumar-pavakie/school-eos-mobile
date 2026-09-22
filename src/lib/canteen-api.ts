// Canteen counter -- real backend module at
// school-eos-backend/src/modules/canteen/ (CANTEEN_VENDOR-only). No NFC
// reader is wired up yet, so `searchCanteenStudents` is the manual stand-in
// for a card tap: canteen staff types a name/admission number and picks
// the match themselves (see the backend repository's own header comment).
// Errors (insufficient balance, frozen wallet, not found) come through as
// ApiError with the backend's own real message, same as every other
// -api.ts file in this app -- callers render err.message verbatim.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface CanteenStudent {
  id: string;
  name: string;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  hasWallet: boolean;
  walletActive: boolean;
  balancePaise: number | null;
}

export interface CanteenChargeReceipt {
  transactionId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  amountPaise: number;
  balanceAfterPaise: number;
  createdAt: string;
}

export interface CanteenHistoryEntry {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  amountPaise: number;
  balanceAfterPaise: number;
  createdAt: string;
  performedByName: string | null;
}

export async function searchCanteenStudents(query: string): Promise<CanteenStudent[]> {
  if (query.trim().length < 2) return [];
  const res = await authedRequest<ApiEnvelope<CanteenStudent[]>>(
    `/canteen/students/search?query=${encodeURIComponent(query)}`,
  );
  return res.data;
}

export async function chargeCanteenWallet(
  studentId: string,
  amountPaise: number,
  idempotencyKey: string,
): Promise<CanteenChargeReceipt> {
  const res = await authedRequest<ApiEnvelope<CanteenChargeReceipt>>('/canteen/charge', {
    method: 'POST',
    body: { studentId, amountPaise, idempotencyKey },
  });
  return res.data;
}

export async function listCanteenHistory(limit = 50): Promise<CanteenHistoryEntry[]> {
  const res = await authedRequest<ApiEnvelope<CanteenHistoryEntry[]>>(`/canteen/history?limit=${limit}`);
  return res.data;
}

export interface CanteenDashboard {
  todaySalesPaise: number;
  todayTransactionCount: number;
  todayUniqueStudents: number;
  todayAvgTransactionPaise: number;
  /** null when yesterday had zero sales (no real baseline to compare against). */
  salesDeltaPct: number | null;
  transactionsDeltaPct: number | null;
  /** null when nothing sold yet today. */
  peakHour: number | null;
  declinedToday: number;
  weeklyTrend: { date: string; totalPaise: number }[];
  hourlyToday: { hour: number; totalPaise: number }[];
  gradeBreakdown: { gradeName: string; totalPaise: number }[];
  recentTransactions: CanteenHistoryEntry[];
}

export async function getCanteenDashboard(): Promise<CanteenDashboard> {
  const res = await authedRequest<ApiEnvelope<CanteenDashboard>>('/canteen/dashboard');
  return res.data;
}
