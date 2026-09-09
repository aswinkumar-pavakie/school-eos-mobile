// Principal Academic Calendar module -- GET /calendar-events already grants
// PRINCIPAL the identical method-level access as VICE_PRINCIPAL (confirmed by
// direct backend audit: academic/calendar-events.controller.ts's list/get
// both carry @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')). Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  listCalendarEvents,
  getCalendarEvent,
  type CalendarEventRow,
  type CalendarEventListParams,
} from './vice-principal-academic-calendar-api';
