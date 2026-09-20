// Principal Attendance Sessions module -- class-level attendance oversight,
// a COMPLETELY DIFFERENT backend module than principal-attendance-api.ts's
// own staff daily roll call (staff_attendance_event, write-capable). This
// one is attendance-sessions.controller.ts, read-only, and by explicit
// later instruction PRINCIPAL was added to the same
// @Roles('ADMIN','PRINCIPAL','CORRESPONDENT','VICE_PRINCIPAL') grant
// VICE_PRINCIPAL's own mobile module already uses (confirmed live). Full
// feature parity with the website's own /principal/attendance-sessions
// page, which was previously mobile-missing. Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  listSessions,
  getSession,
  type AttendanceSessionRow,
  type AttendanceSessionDetail,
  type AttendanceStatus,
} from './vice-principal-attendance-api';
