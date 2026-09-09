// Vice Principal Students module (Phase 4) -- every call here hits a REAL,
// pre-existing backend endpoint (students.controller.ts, grades.controller.ts,
// sections.controller.ts), each newly (and minimally) broadened to also allow
// VICE_PRINCIPAL on exactly the read methods this module needs -- see each
// controller's own comment. No new backend service, no duplicated Student
// model. Deliberately excludes /students/:id/transport, /fees, /wallet
// (Finance/Operations, out of this phase's scope) and /enrolments (the
// detail screen reads current grade/section straight off the student row).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface StudentListRow {
  id: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  status: string;
  gradeId: string | null;
  gradeName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  rollNo: number | null;
  photoUrl: string | null;
}

export interface StudentListParams {
  search?: string;
  status?: string;
  gradeId?: string;
  sectionId?: string;
  page?: number;
  limit?: number;
}

export async function listStudents(
  params: StudentListParams,
): Promise<{ data: StudentListRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.gradeId) query.set('gradeId', params.gradeId);
  if (params.sectionId) query.set('sectionId', params.sectionId);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  const res = await authedRequest<PagedEnvelope<StudentListRow[]>>(`/students?${query.toString()}`);
  return res;
}

export interface StudentDetail extends StudentListRow {
  admissionDate: string;
  dateOfLeaving: string | null;
}

export async function getStudent(id: string): Promise<StudentDetail> {
  const res = await authedRequest<ApiEnvelope<StudentDetail>>(`/students/${id}`);
  return res.data;
}

export interface AttendanceSummary {
  presentCount: number;
  totalCount: number;
  percentage: number | null;
}

export async function getAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const res = await authedRequest<ApiEnvelope<AttendanceSummary>>(`/students/${studentId}/attendance-summary`);
  return res.data;
}

export interface GuardianRow {
  id: string;
  firstName: string;
  lastName: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  isAuthorisedPickup: boolean;
}

/** Deliberately narrowed to name/relationship/contact-flags only -- the real
 * row also carries occupation and annualIncomePaise, which have no place in
 * a leadership overview and are never rendered here even though the backend
 * response includes them. */
export async function listGuardians(studentId: string): Promise<GuardianRow[]> {
  const res = await authedRequest<ApiEnvelope<GuardianRow[]>>(`/students/${studentId}/guardians`);
  return res.data;
}

export interface GradeOption {
  id: string;
  name: string;
}

export async function listGrades(): Promise<GradeOption[]> {
  const res = await authedRequest<ApiEnvelope<GradeOption[]>>('/grades');
  return res.data;
}

export interface SectionOption {
  id: string;
  gradeId: string;
  name: string;
}

export async function listSections(gradeId?: string): Promise<SectionOption[]> {
  const query = gradeId ? `?gradeId=${gradeId}` : '';
  const res = await authedRequest<ApiEnvelope<SectionOption[]>>(`/sections${query}`);
  return res.data;
}
