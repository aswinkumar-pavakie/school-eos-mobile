// Faculty "Student Attendance" -- real backend calls only (school-eos-
// backend's faculty/attendance controller). Class-advisor scoped; the
// backend itself is the source of truth for the 403 boundary, this file just
// carries the calls.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: string;
  reason: string | null;
  createdAt: string;
  firstName: string;
  lastName: string | null;
  rollNo: number | null;
}

export interface AttendanceSession {
  id: string;
  sectionId: string;
  sessionDate: string;
  sessionType: string;
  markedBy: string | null;
  markedAt: string | null;
  isLocked: boolean;
}

export interface AttendanceRoster {
  session: AttendanceSession;
  records: AttendanceRecord[];
}

export async function getRoster(sectionId: string, date: string): Promise<AttendanceRoster> {
  const res = await authedRequest<ApiEnvelope<AttendanceRoster>>(
    `/faculty/attendance?sectionId=${sectionId}&date=${date}`,
  );
  return res.data;
}

export async function markAllPresent(sectionId: string, date: string): Promise<AttendanceRoster> {
  const res = await authedRequest<ApiEnvelope<AttendanceRoster>>(
    `/faculty/attendance/mark-all-present?sectionId=${sectionId}&date=${date}`,
    { method: 'POST' },
  );
  return res.data;
}

export async function markRecord(
  sectionId: string,
  recordId: string,
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY',
  reason?: string,
): Promise<AttendanceRecord> {
  const res = await authedRequest<ApiEnvelope<AttendanceRecord>>(
    `/faculty/attendance/records/${recordId}?sectionId=${sectionId}`,
    { method: 'POST', body: { status, reason } },
  );
  return res.data;
}

export interface AttendanceHistoryDay {
  sessionId: string;
  date: string;
  total: number;
  present: number;
  absent: number;
  onLeave: number;
  absentees: { studentId: string; firstName: string; lastName: string | null; rollNo: number | null }[];
}

export async function getHistory(sectionId: string, monthStart: string, monthEnd: string): Promise<AttendanceHistoryDay[]> {
  const res = await authedRequest<ApiEnvelope<AttendanceHistoryDay[]>>(
    `/faculty/attendance/history?sectionId=${sectionId}&monthStart=${monthStart}&monthEnd=${monthEnd}`,
  );
  return res.data;
}
