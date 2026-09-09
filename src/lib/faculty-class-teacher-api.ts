// Class Teacher -- real backend calls only (faculty/class-teacher
// controller). Class-advisor only: a real-time duty dashboard (only the two
// duties this schema actually backs -- attendance register + leave
// approvals, deliberately not inventing "discipline notes"/"fee follow-up"
// with no real table) plus full CRUD over student_duty_assignment (the
// "class leader" feature).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ClassDuty {
  key: string;
  title: string;
  meta: string;
  status: string;
  pending?: { id: string; studentName: string; fromDate: string; toDate: string; reason: string }[];
}

export interface StudentDuty {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: number | null;
  title: string;
  duties: string | null;
  status: string;
  createdAt: string;
}

export interface ClassTeacherDashboard {
  stats: { strength: number; presentToday: number; onLeaveToday: number };
  classDuties: ClassDuty[];
  officers: StudentDuty[];
}

export async function getDashboard(sectionId: string): Promise<ClassTeacherDashboard> {
  const res = await authedRequest<ApiEnvelope<ClassTeacherDashboard>>(`/faculty/class-teacher/sections/${sectionId}/dashboard`);
  return res.data;
}

export interface StudentSearchResult {
  studentId: string;
  studentName: string;
  rollNo: number | null;
}

export async function searchClassStudents(sectionId: string, q: string): Promise<StudentSearchResult[]> {
  const res = await authedRequest<ApiEnvelope<StudentSearchResult[]>>(`/faculty/class-teacher/sections/${sectionId}/students/search?q=${encodeURIComponent(q)}`);
  return res.data;
}

export async function createDuty(sectionId: string, input: { studentId: string; title: string; duties?: string }): Promise<StudentDuty> {
  const res = await authedRequest<ApiEnvelope<StudentDuty>>(`/faculty/class-teacher/sections/${sectionId}/duties`, { method: 'POST', body: input });
  return res.data;
}

export async function updateDuty(id: string, input: Partial<{ title: string; duties: string; status: 'ACTIVE' | 'ENDED' }>): Promise<StudentDuty> {
  const res = await authedRequest<ApiEnvelope<StudentDuty>>(`/faculty/class-teacher/duties/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteDuty(id: string): Promise<void> {
  await authedRequest(`/faculty/class-teacher/duties/${id}`, { method: 'DELETE' });
}
