// Timetable -- real backend calls only (faculty/timetable controller).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface TimetablePeriod {
  periodId: string;
  periodNo: number;
  label: string | null;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableSlot {
  slotId: string;
  periodId: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  room: string | null;
  subjectOfferingId: string;
  subjectName: string;
  gradeName: string;
  sectionName: string;
  isPractical: boolean;
}

export interface WeeklyTimetable {
  periods: TimetablePeriod[];
  days: { dayOfWeek: number; slots: TimetableSlot[] }[];
}

export async function getWeeklyTimetable(): Promise<WeeklyTimetable> {
  const res = await authedRequest<ApiEnvelope<WeeklyTimetable>>('/faculty/timetable');
  return res.data;
}

// Class Teacher (Advisor)'s own class-wide timetable -- every subject's
// slots for their one advisor section (real teacher names, not "am I free"),
// distinct from getWeeklyTimetable above which is scoped to subject-teaching
// offerings only. See backend's FacultyTimetableService.getForAdvisorSection.
export interface AdvisorSectionSlot {
  slotId: string;
  periodId: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  room: string | null;
  isDraft: boolean;
  subjectOfferingId: string;
  subjectName: string;
  teacherName: string | null;
}

export interface AdvisorSectionTimetable {
  section: { sectionId: string; academicYearId: string; gradeName: string; sectionName: string; stage: string | null };
  periods: TimetablePeriod[];
  days: { dayOfWeek: number; slots: AdvisorSectionSlot[] }[];
}

export async function getAdvisorSectionTimetable(): Promise<AdvisorSectionTimetable> {
  const res = await authedRequest<ApiEnvelope<AdvisorSectionTimetable>>('/faculty/timetable/section');
  return res.data;
}
