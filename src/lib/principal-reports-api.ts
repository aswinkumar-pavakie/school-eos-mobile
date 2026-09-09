// Principal Reports module -- GET /admin/reports-summary already grants
// PRINCIPAL the FULL, unredacted summary (reports.controller.ts: the handler
// itself branches on actor.roles -- ADMIN/PRINCIPAL get every section
// including requestsApprovals; every other caller, including VICE_PRINCIPAL,
// has that one field stripped). Confirmed by reading the actual redaction
// branch, not inferred -- Principal genuinely gets more than VP here. No new
// analytics engine: reuses the exact same aggregation query VP's own
// (redacted) Reports module already calls.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ReportsSummary {
  enrollment: {
    byGrade: { gradeName: string; count: number }[];
    byGender: { gender: string; count: number }[];
    activeCount: number;
    inactiveCount: number;
  };
  staff: {
    byDesignation: { designation: string; count: number }[];
    teachingCount: number;
    nonTeachingCount: number;
  };
  attendance: {
    dailyPercentPresent: { date: string; percentPresent: number }[];
  };
  fees: {
    byState: { state: string; count: number }[];
    totalOutstandingPaise: string;
  };
  transport: {
    ridershipByRoute: { routeName: string; count: number }[];
    vehiclesByStatus: { status: string; count: number }[];
  };
  hostel: {
    occupancyByHostel: { hostelName: string; occupied: number; vacant: number }[];
  };
  inventory: {
    byStatus: { status: string; count: number }[];
  };
  library: {
    byStatus: { status: string; count: number }[];
    outstandingFinesPaise: string | number;
  };
  requestsApprovals: {
    byState: { state: string; count: number }[];
    byType: { requestType: string; count: number }[];
  };
  generatedAt: string;
}

export async function getReportsSummary(): Promise<ReportsSummary> {
  const res = await authedRequest<ApiEnvelope<ReportsSummary>>('/admin/reports-summary');
  return res.data;
}
