// Principal Dashboard -- GET /principal/dashboard-summary
// (principal-dashboard.controller.ts, @Roles('PRINCIPAL', 'VICE_PRINCIPAL')).
// A previous pass here under-typed this response to only 4 fields based on a
// web-page audit; a real live call against the running backend (2026-09-17)
// confirms the endpoint actually returns considerably more -- staffMarkedToday
// and hostelOccupancy in particular are exactly the two real data points the
// Principal mobile design's own (shipped `display:none`) Home stat tiles
// wanted. Widened to match the real response instead of re-hiding data that
// genuinely exists. No write endpoint on this controller to accidentally widen.
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
  staffMarkedToday: { present: number; absent: number; onLeave: number; total: number };
  hostelOccupancy: { occupiedBeds: number; totalBeds: number };
  staffSplit: { teaching: number; support: number };
  studentResidence: { hostellers: number; dayScholars: number };
  activeSectionsCount: number;
  subjectsCount: number;
  vehiclesCount: number;
  parentLoginsIssued: { issued: number; totalFamilies: number };
  needsAttention: { label: string; sub: string; count: number }[];
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
