// Subject Records -- real backend calls only (faculty/subject-records
// controller). Teaching-offering scoped (subject teacher, not advisor).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface SubjectRecordExam {
  examName: string;
  marksObtained: number | null;
  maxMarks: number;
  isAbsent: boolean;
}

export interface SubjectRecordStudent {
  studentId: string;
  studentName: string;
  rollNo: number | null;
  exams: SubjectRecordExam[];
  totalObtained: number;
  totalMax: number;
  percent: number | null;
  grade: string | null;
  attendancePercent: number;
  guardianPhone: string | null;
}

export interface SubjectRecords {
  students: SubjectRecordStudent[];
  classAvg: number | null;
  highest: number | null;
  studentCount: number;
}

export async function getSubjectRecords(subjectOfferingId: string): Promise<SubjectRecords> {
  const res = await authedRequest<ApiEnvelope<SubjectRecords>>(
    `/faculty/subject-records?subjectOfferingId=${subjectOfferingId}`,
  );
  return res.data;
}
