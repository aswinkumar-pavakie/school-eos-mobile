// Vice Principal Class Timetable module (Phase 9) -- every call here hits a
// REAL, pre-existing backend endpoint (timetable.controller.ts), newly (and
// minimally) broadened to also allow VICE_PRINCIPAL -- see that controller's
// own comment. That controller has NO write endpoint at all (its own comment
// says so), so this module is inherently read-only -- nothing to hide, no
// write access exists anywhere to accidentally expose. No new backend
// service, no duplicated timetable model. Grades/Sections reuse the exact
// same /grades /sections calls already authorized for VP in Phase 4.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface TimetablePeriod {
  id: string;
  periodNo: number;
  label: string;
  startTime: string;
  endTime: string;
  appliesToStage: string | null;
  isBreak: boolean;
}

export async function listPeriods(): Promise<TimetablePeriod[]> {
  const res = await authedRequest<ApiEnvelope<TimetablePeriod[]>>('/timetable/periods');
  return res.data;
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  room: string | null;
  periodId: string;
  periodNo: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  sectionId: string;
  sectionName: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
  teacherStaffId: string;
  teacherFirstName: string;
  teacherLastName: string | null;
}

export async function getSectionTimetable(sectionId: string): Promise<TimetableSlot[]> {
  const res = await authedRequest<ApiEnvelope<TimetableSlot[]>>(`/timetable?sectionId=${sectionId}`);
  return res.data;
}
