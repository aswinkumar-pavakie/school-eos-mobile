// Faculty "Leave" (student leave, class-advisor side) -- real backend calls
// only. Raising a request is the Parent app's own job (out of scope here);
// this is the advisor's inbox. Deciding goes through the generic approvals
// endpoints (faculty-approvals-api.ts), using each request's own
// approvalRequestId.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  gradeName: string | null;
  sectionName: string | null;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentFileName: string | null;
  attachmentObjectKey: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  approvalRequestId: string | null;
}

export async function listStudentLeaveRequests(): Promise<StudentLeaveRequest[]> {
  const res = await authedRequest<ApiEnvelope<StudentLeaveRequest[]>>('/faculty/student-leave');
  return res.data;
}
