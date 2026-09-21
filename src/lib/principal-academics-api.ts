// Principal Academics module -- GET /academic-years, /subjects, /mediums,
// /departments all grant PRINCIPAL the identical class-level access as
// VICE_PRINCIPAL (confirmed by direct backend audit: same @Roles line, no
// method-level narrowing either way). Re-exporting the already-correct VP
// module rather than duplicating it.

export {
  listAcademicYears,
  listSubjects,
  listMediums,
  listDepartments,
  type AcademicYear,
  type Subject,
  type Medium,
  type Department,
} from './vice-principal-academics-api';

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

// GET /subject-offerings/all is @Roles('ADMIN', 'PRINCIPAL', 'CORRESPONDENT')
// only -- VICE_PRINCIPAL has no grant here, confirmed live by direct
// backend audit of subject-offerings.controller.ts -- so this one function
// lives here, Principal-only, rather than in the shared VP file. Full
// feature parity with the website's own Subject Mapping page, previously
// mobile-missing.
export interface SubjectOffering {
  id: string;
  academicYearId: string;
  sectionId: string;
  gradeName: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  teacherStaffId: string | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  isPractical: boolean;
  weeklyPeriods: number;
  status: string;
}
export async function listAllSubjectOfferings(): Promise<SubjectOffering[]> {
  const res = await authedRequest<ApiEnvelope<SubjectOffering[]>>('/subject-offerings/all');
  return res.data;
}
