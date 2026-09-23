// Exams -- real backend calls only (faculty/exams controller). Serves both
// Faculty's own "subjects I teach" Exams view and Class Teacher's own
// whole-advisor-section Exams view through the same endpoint -- the
// backend already unions both scopes per caller (see
// FacultyExamScheduleService.listExamSubjects's own header note).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ExamSubjectRow {
  examId: string;
  examName: string;
  examType: string;
  term: string | null;
  subjectOfferingId: string;
  subjectName: string;
  sectionId: string;
  gradeName: string;
  sectionName: string;
  examDate: string | null;
  startTime: string | null;
}

export async function listExamSubjects(): Promise<ExamSubjectRow[]> {
  const res = await authedRequest<ApiEnvelope<ExamSubjectRow[]>>('/faculty/exams/subjects');
  return res.data;
}

export interface ExamSubjectStudentMark {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  marksObtained: number | null;
  maxMarks: number | null;
  isAbsent: boolean;
}

export async function getMarksForExamSubject(subjectOfferingId: string, examId: string): Promise<{ students: ExamSubjectStudentMark[] }> {
  const res = await authedRequest<ApiEnvelope<{ students: ExamSubjectStudentMark[] }>>(
    `/faculty/exams/subjects/${subjectOfferingId}/exam/${examId}/marks`,
  );
  return res.data;
}
