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
