// Homework -- real backend calls only (faculty/homework controller).
// Teaching-offering scoped, full CRUD; submission is the Parent/Student
// app's own job (out of scope) -- this only tracks and reports on it.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface HomeworkItem {
  id: string;
  subjectOfferingId: string;
  sectionId: string;
  gradeName: string;
  sectionName: string;
  subjectName: string;
  title: string;
  description: string | null;
  attachmentKeys: string[] | null;
  assignedOn: string;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  total: number;
  finishedCount: number;
  gradedCount: number;
}

export interface HomeworkList {
  items: HomeworkItem[];
  stats: { open: number; dueToday: number; ungraded: number };
  classes: { subjectOfferingId: string; label: string }[];
}

export async function listHomework(): Promise<HomeworkList> {
  const res = await authedRequest<ApiEnvelope<HomeworkList>>('/faculty/homework');
  return res.data;
}

export interface CreateHomeworkInput {
  subjectOfferingId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks?: number;
}

export async function createHomework(input: CreateHomeworkInput): Promise<HomeworkItem> {
  const res = await authedRequest<ApiEnvelope<HomeworkItem>>('/faculty/homework', { method: 'POST', body: input });
  return res.data;
}

export async function updateHomework(id: string, input: Partial<CreateHomeworkInput> & { status?: string }): Promise<HomeworkItem> {
  const res = await authedRequest<ApiEnvelope<HomeworkItem>>(`/faculty/homework/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteHomework(id: string): Promise<void> {
  await authedRequest(`/faculty/homework/${id}`, { method: 'DELETE' });
}

export interface HomeworkRosterEntry {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  status: string;
  submittedAt: string | null;
  isLate: boolean;
  marksAwarded: number | null;
  feedback: string | null;
}

export async function getHomeworkRoster(id: string, tab?: 'DONE' | 'NOT_DONE'): Promise<{ homework: HomeworkItem; roster: HomeworkRosterEntry[] }> {
  const qs = tab ? `?tab=${tab}` : '';
  const res = await authedRequest<ApiEnvelope<{ homework: HomeworkItem; roster: HomeworkRosterEntry[] }>>(`/faculty/homework/${id}/roster${qs}`);
  return res.data;
}
