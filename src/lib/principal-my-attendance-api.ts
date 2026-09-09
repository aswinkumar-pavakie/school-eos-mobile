// Principal -> My Attendance -- the authenticated Principal's OWN attendance,
// distinct from the school-wide staff Attendance module (Principal's own
// write-capable roster/marking tool, an entirely separate screen -- see
// principal-attendance-api.ts). Backed by GET /staff/me/attendance-history,
// self-scoped server-side (staffId resolved from the caller's own personId,
// never client-supplied) -- confirmed by direct backend audit:
// staff.controller.ts:90-91, `@Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')`.
// PRINCIPAL was already explicitly granted this route, identical to
// VICE_PRINCIPAL's own grant -- this was missed in the first implementation
// pass and is being added now on that same real evidence, not invented.
//
// Read-only, same as VP's own version: no punch-in/out action, no
// correction-request submission -- neither exists as a real self-service
// capability in this backend for any role.

export {
  getMyAttendanceHistory,
  type MyAttendanceDay,
  type MyAttendanceCounts,
  type MyAttendanceHistory,
} from './vice-principal-my-attendance-api';
