// Vice Principal Academics module (Phase 8) -- every call here hits a REAL,
// pre-existing backend endpoint (academic-years/subjects/mediums/departments
// controllers), each newly (and minimally) broadened to also allow
// VICE_PRINCIPAL -- see each controller's own comment. Grades/Sections reuse
// the exact same /grades /sections calls already authorized for VP in
// Phase 4 -- no duplicate API. No new backend service, no duplicated models.
// Deliberately excludes subject-offerings (teacher/section teaching
// assignments -- Timetable-adjacent, no Principal precedent, out of this
// phase's scope) and grade-scales/houses/campuses/school (no Principal
// precedent to extend, not core "academics" per this phase's own definition).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const res = await authedRequest<ApiEnvelope<AcademicYear[]>>('/academic-years');
  return res.data;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  subjectType: string;
  appliesToStage: string | null;
  departmentId: string | null;
  status: string;
}

export async function listSubjects(): Promise<Subject[]> {
  const res = await authedRequest<ApiEnvelope<Subject[]>>('/subjects');
  return res.data;
}

export interface Medium {
  id: string;
  name: string;
  code: string;
  status: string;
}

export async function listMediums(): Promise<Medium[]> {
  const res = await authedRequest<ApiEnvelope<Medium[]>>('/mediums');
  return res.data;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  hodStaffId: string | null;
  status: string;
}

export async function listDepartments(): Promise<Department[]> {
  const res = await authedRequest<ApiEnvelope<Department[]>>('/departments');
  return res.data;
}
