// Academic Calendar -- real backend calls only (faculty/calendar
// controller). SCHOOL events + any STAGE event matching a stage this
// faculty actually teaches/advises in.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  isHoliday: boolean;
  startDate: string;
  endDate: string;
  scopeType: string;
  scopeStage: string | null;
}

export interface CurrentAcademicYear {
  name: string;
  startDate: string;
  endDate: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  academicYear: CurrentAcademicYear | null;
}

export async function listCalendarEvents(): Promise<CalendarData> {
  const res = await authedRequest<ApiEnvelope<CalendarData>>('/faculty/calendar');
  return res.data;
}
