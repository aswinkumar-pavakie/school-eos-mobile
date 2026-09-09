// Principal Class Timetable module -- GET /timetable already grants PRINCIPAL
// the identical class-level access as VICE_PRINCIPAL (timetable.controller.ts:
// @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'), a GET-only controller with
// no write methods to narrow). Confirmed identical scope by direct backend
// audit -- re-exporting the already-correct VP module rather than duplicating.

export {
  listPeriods,
  getSectionTimetable,
  type TimetablePeriod,
  type TimetableSlot,
} from './vice-principal-timetable-api';
