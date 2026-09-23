// Class advisor's own full-profile read on one student in their section --
// real backend call only (faculty/students/:studentId, already scoped
// server-side to "a class you are the class advisor of" -- see backend's
// FacultyStudentDetailService).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface StudentDetailRecord {
  id: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodGroup: string | null;
  isHosteller: boolean;
  usesSchoolTransport: boolean;
  status: string;
  gradeName: string | null;
  sectionName: string | null;
  rollNo: number | null;
}

export interface GuardianLink {
  id: string;
  relationship: string;
  firstName: string;
  lastName: string | null;
  occupation: string | null;
  isPrimaryContact: boolean;
}

export interface StudentAttendanceSummary {
  presentCount: number;
  totalCount: number;
  percentage: number | null;
}

export interface StudentFeesSummary {
  overallStatus: string;
  totalDuePaise: string;
  totalPaidPaise: string;
  totalPendingPaise: string;
  totalOverduePaise: string;
}

export interface StudentDetail {
  student: StudentDetailRecord;
  guardians: GuardianLink[];
  attendance: StudentAttendanceSummary;
  fees: StudentFeesSummary;
}

export async function getStudentDetail(studentId: string): Promise<StudentDetail> {
  const res = await authedRequest<ApiEnvelope<StudentDetail>>(`/faculty/students/${studentId}`);
  return res.data;
}
