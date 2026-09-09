// Vice Principal Attendance module (Phase 7) -- every call here hits a REAL,
// pre-existing backend endpoint (attendance-sessions.controller.ts), newly
// (and minimally) broadened to also allow VICE_PRINCIPAL on exactly the two
// read methods this module needs -- see that controller's own comment. No
// new backend service, no duplicated Attendance model. create/lock stay
// ADMIN-only, untouched -- this module is read-only oversight, no write
// access implied or added.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface AttendanceSessionRow {
  id: string;
  sectionId: string;
  sessionDate: string;
  sessionType: string;
  isLocked: boolean;
}

export interface SessionListParams {
  sectionId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listSessions(
  params: SessionListParams,
): Promise<{ data: AttendanceSessionRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.sectionId) query.set('sectionId', params.sectionId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 100));
  return authedRequest<PagedEnvelope<AttendanceSessionRow[]>>(`/attendance-sessions?${query.toString()}`);
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'HALF_DAY';

export interface AttendanceRecordRow {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  reason: string | null;
  firstName: string;
  lastName: string | null;
  rollNo: number | null;
}

export interface AttendanceSessionDetail extends AttendanceSessionRow {
  records: AttendanceRecordRow[];
  counts: Record<AttendanceStatus, number>;
}

export async function getSession(id: string): Promise<AttendanceSessionDetail> {
  const res = await authedRequest<ApiEnvelope<AttendanceSessionDetail>>(`/attendance-sessions/${id}`);
  return res.data;
}
