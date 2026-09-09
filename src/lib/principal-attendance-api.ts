// Principal Attendance module -- GET/POST /staff-attendance
// (staff-attendance.controller.ts: @Roles('ADMIN', 'PRINCIPAL'), BOTH the
// roster read and the bulk mark write, no method-level narrowing on either).
// This is a COMPLETELY DIFFERENT backend module than Vice Principal's own
// "Attendance" screen (attendance-sessions.controller.ts, read-only,
// @Roles('ADMIN', 'VICE_PRINCIPAL') -- no PRINCIPAL grant there at all) --
// confirmed by direct backend audit, not assumed from the shared "Attendance"
// label. Principal's own controller comment states this explicitly: "the one
// write action in this build where Principal has full parity with Admin
// rather than a narrowed, view-only role." Do not copy VP's read-only
// Attendance scope onto Principal -- this is a genuinely different,
// write-capable capability, reusing the SAME staff_attendance_event table
// and markBulk write path Admin's own web page already calls.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface StaffDailyStatusRow {
  staffId: string;
  employeeNo: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  status: 'CHECK_IN' | 'ABSENT' | null;
  markedAt: string | null;
  reason: string | null;
}

export interface StaffAttendanceQueryParams {
  date: string;
  isTeaching?: boolean;
  gradeId?: string;
  sectionId?: string;
  subjectId?: string;
}

export async function getStaffAttendanceRoster(params: StaffAttendanceQueryParams): Promise<StaffDailyStatusRow[]> {
  const query = new URLSearchParams();
  query.set('date', params.date);
  if (params.isTeaching !== undefined) query.set('isTeaching', String(params.isTeaching));
  if (params.gradeId) query.set('gradeId', params.gradeId);
  if (params.sectionId) query.set('sectionId', params.sectionId);
  if (params.subjectId) query.set('subjectId', params.subjectId);
  const res = await authedRequest<ApiEnvelope<StaffDailyStatusRow[]>>(`/staff-attendance?${query.toString()}`);
  return res.data;
}

export interface MarkStaffAttendanceInput {
  staffIds: string[];
  date: string;
  status: 'PRESENT' | 'ABSENT';
  reason: string;
}

export async function markStaffAttendance(input: MarkStaffAttendanceInput): Promise<void> {
  await authedRequest<ApiEnvelope<unknown>>('/staff-attendance/mark', { method: 'POST', body: input });
}
