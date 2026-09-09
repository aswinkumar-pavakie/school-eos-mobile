// Principal Dashboard -- adapts the REAL Principal web dashboard
// (principal/page.tsx), not Vice Principal's own fuller Home dashboard (which
// additionally shows upcoming calendar events, examinations, and
// announcements -- none of which Principal's own real dashboard displays).
// Confirmed by direct audit of principal/page.tsx: exactly 3 KPI cards
// (active students, active staff, current academic year) plus an "Awaiting
// your decision" pending-approvals list -- nothing more, nothing invented.
//
// GET /principal/dashboard-summary -- principal-dashboard.controller.ts:
// @Roles('PRINCIPAL', 'VICE_PRINCIPAL'), single GET, no write endpoint on
// this controller to accidentally widen. Same real, minimal leadership
// summary VP's own dashboard partially reuses -- not a duplicate query.
//
// listPendingApprovals/ApprovalRequestRow are the SAME generic-engine
// functions re-exported from principal-requests-approvals-api.ts -- not
// duplicated here.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface PrincipalDashboardSummary {
  activeStudents: number;
  activeStaff: number;
  currentAcademicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  generatedAt: string;
}

export async function getDashboardSummary(): Promise<PrincipalDashboardSummary> {
  const res = await authedRequest<ApiEnvelope<PrincipalDashboardSummary>>('/principal/dashboard-summary');
  return res.data;
}

export { listPendingApprovals, type ApprovalRequestRow } from './vice-principal-dashboard-api';

// listUpcomingCalendarEvents is NOT part of Principal's own real web
// dashboard (see this file's own header comment) -- re-exported here only
// for consumption by the separate My Day personal-overview screen, which is
// not a copy of the Principal dashboard. GET /calendar-events already grants
// PRINCIPAL identically to VICE_PRINCIPAL (calendar-events.controller.ts,
// `@Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')` on both read methods) --
// same evidence principal-academic-calendar-api.ts already relies on.
export { listUpcomingCalendarEvents, type CalendarEventRow } from './vice-principal-dashboard-api';
