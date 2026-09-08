// Class Results -- real backend calls only (faculty/class-results
// controller). Class-advisor scoped, one real exam at a time.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ClassResultsExam {
  examId: string;
  examName: string;
  examType: string;
  term: string;
  examState: string;
}

export interface GradeBand {
  grade: string;
  label: string;
  count: number;
  percentOfClass: number;
  students: { studentName: string; percent: number | null }[];
}

export interface TopperEntry {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  totalObtained: number;
  totalMax: number;
  percent: number | null;
  subjects: { subjectName: string; marksObtained: number | null; maxMarks: number; isAbsent: boolean }[];
}

export interface ClassResults {
  classAvg: number | null;
  pass: { count: number; total: number };
  topper: number | null;
  gradeDistribution: GradeBand[];
  toppers: TopperEntry[];
  students: (TopperEntry & { grade: string | null; passed: boolean })[];
}

export async function listExamsForSection(sectionId: string): Promise<ClassResultsExam[]> {
  const res = await authedRequest<ApiEnvelope<ClassResultsExam[]>>(`/faculty/class-results/sections/${sectionId}/exams`);
  return res.data;
}

export async function getClassResults(sectionId: string, examId: string): Promise<ClassResults> {
  const res = await authedRequest<ApiEnvelope<ClassResults>>(`/faculty/class-results/sections/${sectionId}/exams/${examId}`);
  return res.data;
}
