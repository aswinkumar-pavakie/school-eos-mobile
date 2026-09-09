// Vice Principal Faculty module (Phase 6) -- every call here hits a REAL,
// pre-existing backend endpoint (staff.controller.ts), each newly (and
// minimally) broadened to also allow VICE_PRINCIPAL on exactly the five read
// methods this module needs -- see that controller's own comment. No new
// backend service, no duplicated Staff model. create/update/exit stay
// ADMIN-only, untouched.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface FacultyListRow {
  id: string;
  firstName: string;
  lastName: string | null;
  employeeNo: string;
  designation: string | null;
  teacherCategory: string | null;
  isTeaching: boolean;
  status: string;
  photoUrl: string | null;
}

export interface FacultyListParams {
  search?: string;
  status?: string;
  designation?: string;
  isTeaching?: 'true' | 'false';
  gradeId?: string;
  sectionId?: string;
  page?: number;
  limit?: number;
}

export async function listFaculty(
  params: FacultyListParams,
): Promise<{ data: FacultyListRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.designation) query.set('designation', params.designation);
  if (params.isTeaching) query.set('isTeaching', params.isTeaching);
  if (params.gradeId) query.set('gradeId', params.gradeId);
  if (params.sectionId) query.set('sectionId', params.sectionId);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<FacultyListRow[]>>(`/staff?${query.toString()}`);
}

export async function listDesignations(): Promise<string[]> {
  const res = await authedRequest<ApiEnvelope<string[]>>('/staff/designations');
  return res.data;
}

export interface FacultyDetail extends FacultyListRow {
  postType: string | null;
  dateOfJoining: string;
  dateOfExit: string | null;
}

export async function getFaculty(id: string): Promise<FacultyDetail> {
  const res = await authedRequest<ApiEnvelope<FacultyDetail>>(`/staff/${id}`);
  return res.data;
}

export interface AttendanceSummary {
  presentCount: number;
  totalCount: number;
  percentage: number | null;
}

export async function getAttendanceSummary(staffId: string): Promise<AttendanceSummary> {
  const res = await authedRequest<ApiEnvelope<AttendanceSummary>>(`/staff/${staffId}/attendance-summary`);
  return res.data;
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  sectionId: string;
  sectionName: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
}

/** Real timetable slots, used ONLY to derive the distinct set of classes/
 * sections/subjects a teacher is assigned to -- rendered as a plain
 * "Assignments" list, never as a day/period grid. Building the actual
 * Timetable module (day-by-day schedule UI) is explicitly out of this
 * phase's scope. */
export async function listTimetableSlots(staffId: string): Promise<TimetableSlot[]> {
  const res = await authedRequest<ApiEnvelope<TimetableSlot[]>>(`/staff/${staffId}/timetable`);
  return res.data;
}
