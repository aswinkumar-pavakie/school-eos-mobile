// Class Teacher (Advisor) Fees -- real-time fee-dues summary for one
// section, backed by faculty-fees.controller.ts / FacultyFeesService.
// Read-only: this is "which of my students owe fees," not a payment flow
// (that stays Parent-only, via /fees).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface SectionFeeRow {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  parentName: string | null;
  status: 'OVERDUE' | 'DUE';
  amountPending: number;
  term: string;
  dueDate: string;
}

export interface SectionFeesSummary {
  studentsWithDues: number;
  totalStudents: number;
  overdueCount: number;
  dueCount: number;
  paidCount: number;
  rows: SectionFeeRow[];
}

export async function getSectionFees(sectionId: string): Promise<SectionFeesSummary> {
  const res = await authedRequest<ApiEnvelope<SectionFeesSummary>>(
    `/faculty/fees?sectionId=${encodeURIComponent(sectionId)}`,
  );
  return res.data;
}
