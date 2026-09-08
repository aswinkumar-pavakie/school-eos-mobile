// Vice Principal Examination Timetable module (Phase 10) -- reuses
// listExaminations/ExamRow from vice-principal-dashboard-api.ts (Phase 3)
// rather than duplicating that API client -- see this file's own re-export
// below. The one genuinely new call here, getExamSchedules, hits a REAL,
// pre-existing backend endpoint (exams.controller.ts's own
// GET /examinations/:id/schedules), newly (and minimally) broadened to also
// allow VICE_PRINCIPAL -- see that controller's own comment. No new backend
// service, no duplicated exam model.
//
// Deliberately renders scheduling fields only (date/time/room/subject/class/
// teacher) -- the same real rows also carry maxMarks/passMarks/practical
// marks fields, which belong to the separate Examinations module (assessment
// configuration), explicitly out of this phase's scope, and are never
// rendered by this module's screens even though the response includes them.

import { authedRequest } from './auth';

export { listExaminations } from './vice-principal-dashboard-api';
export type { ExamRow } from './vice-principal-dashboard-api';

interface ApiEnvelope<T> {
  data: T;
}

export interface ExamDetail {
  id: string;
  name: string;
  examType: string;
  term: string | null;
  state: string;
  academicYearName: string;
  gradeScaleName: string | null;
  marksEntryOpensAt: string | null;
  marksEntryClosesAt: string | null;
  publishedAt: string | null;
}

export async function getExamination(id: string): Promise<ExamDetail> {
  const res = await authedRequest<ApiEnvelope<ExamDetail>>(`/examinations/${id}`);
  return res.data;
}

export interface ExamScheduleRow {
  id: string;
  examId: string;
  gradeName: string;
  sectionName: string;
  subjectName: string;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  examDate: string;
  startTime: string;
  durationMinutes: number;
  room: string | null;
}

export async function getExamSchedules(examId: string): Promise<ExamScheduleRow[]> {
  const res = await authedRequest<ApiEnvelope<ExamScheduleRow[]>>(`/examinations/${examId}/schedules`);
  return res.data;
}
