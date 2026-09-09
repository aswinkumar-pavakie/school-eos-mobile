// Vice Principal My Attendance (Phase 27) -- the AUTHENTICATED VP'S OWN
// attendance, distinct from the school-wide Attendance module (student/
// faculty attendance oversight, an entirely separate set of screens/
// endpoints, untouched by this phase). Backed by the new, self-scoped
// GET /staff/me/attendance-history -- staffId is resolved server-side from
// the caller's own personId (staffService.getMine), never a client-supplied
// id, so this endpoint can never return another employee's attendance.
//
// Real data only, from the existing staff_attendance_event table (already
// populated by the existing biometric/manual attendance-marking paths,
// untouched by this phase) -- only two real event types exist,
// CHECK_IN and ABSENT; there is no LATE or ON_DUTY status anywhere in this
// schema (unlike a similarly-named, but NOT REAL, endpoint referenced by
// the existing Faculty "My Attendance" screen -- GET /faculty/my-attendance
// does not exist anywhere in the backend; that pre-existing gap belongs to
// Faculty's own module and was not touched or fixed here). No check-in/
// check-out time-of-day, no hours-worked, and no leave/on-duty breakdown
// are shown, because none of that is real, authorized data -- only a
// per-day CHECK_IN/ABSENT status plus this month's and all-time present/
// total counts.
//
// Read-only: no punch-in/out action, no correction-request submission --
// neither exists as a VP-authorized self-service capability anywhere in the
// real backend (the one real "attendance correction" request type lives in
// the Admin-only /approval-requests module, which VP has no access to).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface MyAttendanceDay {
  date: string;
  status: 'CHECK_IN' | 'ABSENT';
  occurredAt: string;
  reason: string | null;
}

export interface MyAttendanceCounts {
  presentCount: number;
  totalCount: number;
  percentage: number | null;
}

export interface MyAttendanceHistory {
  month: string;
  monthlySummary: MyAttendanceCounts;
  allTimeSummary: MyAttendanceCounts;
  days: MyAttendanceDay[];
}

export async function getMyAttendanceHistory(month?: string): Promise<MyAttendanceHistory> {
  const qs = month ? `?month=${month}` : '';
  const res = await authedRequest<ApiEnvelope<MyAttendanceHistory>>(`/staff/me/attendance-history${qs}`);
  return res.data;
}
