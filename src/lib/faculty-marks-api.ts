// Marks Entry -- real backend calls only (faculty/marks controller).
// Teaching-offering scoped. Real dynamic exam-tab list (however many
// exam_subject rows exist), real Draft(ENTERED)/Published lifecycle gated by
// the exam's own state.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ExamSubject {
  examSubjectId: string;
  examId: string;
  examName: string;
  examType: string;
  term: string;
  examState: string;
  maxMarks: number;
  passMarks: number | null;
}

export interface MarksRosterRow {
  markId: string | null;
  studentId: string;
  studentName: string;
  rollNo: number | null;
  marksObtained: number | null;
  isAbsent: boolean;
  isExempted: boolean;
  state: string | null;
}

export async function listExamsForOffering(subjectOfferingId: string): Promise<ExamSubject[]> {
  const res = await authedRequest<ApiEnvelope<ExamSubject[]>>(`/faculty/marks/offerings/${subjectOfferingId}/exams`);
  return res.data;
}

export async function getMarksRoster(examSubjectId: string): Promise<{ examSubject: ExamSubject & { subjectOfferingId: string; sectionId: string }; roster: MarksRosterRow[] }> {
  const res = await authedRequest<ApiEnvelope<{ examSubject: ExamSubject & { subjectOfferingId: string; sectionId: string }; roster: MarksRosterRow[] }>>(
    `/faculty/marks/exam-subjects/${examSubjectId}/roster`,
  );
  return res.data;
}

export interface MarkEntryInput {
  studentId: string;
  marksObtained?: number;
  isAbsent?: boolean;
}

export async function saveMarks(examSubjectId: string, entries: MarkEntryInput[]): Promise<{ saved: number }> {
  const res = await authedRequest<ApiEnvelope<{ saved: number }>>(`/faculty/marks/exam-subjects/${examSubjectId}/save`, {
    method: 'POST',
    body: { entries },
  });
  return res.data;
}

export async function publishMarks(examSubjectId: string): Promise<{ published: number }> {
  const res = await authedRequest<ApiEnvelope<{ published: number }>>(`/faculty/marks/exam-subjects/${examSubjectId}/publish`, {
    method: 'POST',
  });
  return res.data;
}
