// Vice Principal Academic Calendar module (Phase 12) -- reuses
// CalendarEventRow from vice-principal-dashboard-api.ts (Phase 3) rather than
// duplicating that type. The endpoint itself (GET /calendar-events) was
// already fully authorized for VICE_PRINCIPAL by Phase 6's own bugfix (see
// academic/calendar-events.controller.ts's comment -- the controller that
// actually serves this route, not the dead duplicate in modules/calendar/) --
// zero backend changes needed for this phase. listAcademicYears/listGrades/
// listSections reused from Phases 4/8 for the year filter and scope-name
// resolution -- no duplicate lookups.
//
// Real backend query support (CalendarEventQueryDto): academicYearId,
// fromDate, toDate -- nothing else. There is no eventType/grade/section
// server-side filter, so this module's own event-type chips filter the
// already-loaded, already date-bounded set client-side (never presented as a
// server call) -- same honest pattern used for Phase 11's Examinations
// search. Real eventType enum (HOLIDAY/TERM_START/TERM_END/EXAM_WINDOW/PTM/
// FUNCTION/COMPETITION/WORKING_SATURDAY/OTHER) and scopeType enum
// (SCHOOL/CAMPUS/STAGE/GRADE/SECTION) confirmed from CreateCalendarEventDto
// before writing any UI -- nothing invented.

import { authedRequest } from './auth';
import type { CalendarEventRow } from './vice-principal-dashboard-api';

interface ApiEnvelope<T> {
  data: T;
}

export type { CalendarEventRow };

export interface CalendarEventListParams {
  academicYearId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function listCalendarEvents(params: CalendarEventListParams): Promise<CalendarEventRow[]> {
  const query = new URLSearchParams();
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.fromDate) query.set('fromDate', params.fromDate);
  if (params.toDate) query.set('toDate', params.toDate);
  const qs = query.toString();
  const res = await authedRequest<ApiEnvelope<CalendarEventRow[]>>(`/calendar-events${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function getCalendarEvent(id: string): Promise<CalendarEventRow> {
  const res = await authedRequest<ApiEnvelope<CalendarEventRow>>(`/calendar-events/${id}`);
  return res.data;
}
