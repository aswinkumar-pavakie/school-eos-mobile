// Principal Students module -- list/get/attendance-summary/guardians/grades/
// sections are re-exported unchanged from the VP module (identical
// class-level @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL') grant, confirmed
// by direct backend audit). Enrolments/Transport/Fees/Wallet are NEW here --
// students.controller.ts's own class-level @Roles('ADMIN', 'PRINCIPAL') has
// NO VICE_PRINCIPAL on it, and these four :id sub-routes carry no
// method-level override, so they inherit that narrower class default --
// Principal genuinely has broader access here than VP, confirmed by reading
// the actual decorator, not assumed. All four are real, already-authorized
// backend capabilities Principal's own web app already calls (student
// detail's Enrolment history / Fees / Wallet / Transport sections) -- read
// only, no write action anywhere (freeze/unfreeze wallet, section transfer,
// certificate upload all stay ADMIN-only, confirmed by the same audit).

import { authedRequest } from './auth';

export {
  listStudents,
  getStudent,
  getAttendanceSummary,
  listGuardians,
  listGrades,
  listSections,
  type StudentListRow,
  type StudentListParams,
  type StudentDetail,
  type AttendanceSummary,
  type GuardianRow,
  type GradeOption,
  type SectionOption,
} from './vice-principal-students-api';

interface ApiEnvelope<T> {
  data: T;
}

export interface EnrolmentRow {
  id: string;
  studentId: string;
  academicYearId: string;
  sectionId: string;
  rollNo: number | null;
  enrolmentType: string;
  outcome: string | null;
  enrolledOn: string;
  status: string;
  remarks: string | null;
}

export async function listEnrolments(studentId: string): Promise<EnrolmentRow[]> {
  const res = await authedRequest<ApiEnvelope<EnrolmentRow[]>>(`/students/${studentId}/enrolments`);
  return res.data;
}

export interface StudentTransportRow {
  id: string;
  direction: string;
  feeSlab: string | null;
  validFrom: string;
  status: string;
  stopName: string;
  routeName: string;
  vehicleRegistrationNo: string | null;
  driverName: string | null;
}

export async function getStudentTransport(studentId: string): Promise<StudentTransportRow[]> {
  const res = await authedRequest<ApiEnvelope<StudentTransportRow[]>>(`/students/${studentId}/transport`);
  return res.data;
}

export interface StudentFeesSummary {
  assignment: unknown | null;
  demands: unknown[];
  payments: unknown[];
  totalDuePaise: string;
  totalPaidPaise: string;
  totalPendingPaise: string;
  totalOverduePaise: string;
  overallStatus: string;
}

export async function getStudentFees(studentId: string): Promise<StudentFeesSummary> {
  const res = await authedRequest<ApiEnvelope<StudentFeesSummary>>(`/students/${studentId}/fees`);
  return res.data;
}

export interface StudentWallet {
  id: string;
  studentId: string;
  balancePaise: string;
  status: string;
  frozenReason: string | null;
  frozenBy: string | null;
  frozenAt: string | null;
}

export async function getStudentWallet(studentId: string): Promise<StudentWallet | null> {
  const res = await authedRequest<ApiEnvelope<StudentWallet | null>>(`/students/${studentId}/wallet`);
  return res.data;
}
