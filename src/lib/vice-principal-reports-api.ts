// Vice Principal Reports module (Phase 21) -- ONE real, pre-existing backend
// endpoint (reports.controller.ts's cross-cutting summary), newly (and
// deliberately NOT fully) authorized for VICE_PRINCIPAL -- see that
// controller's own comment. Unlike every other role granted this endpoint
// (Admin, Principal), VP receives a REDACTED response: requestsApprovals is
// stripped server-side for any non-Admin/Principal actor, since Requests &
// Approvals has no VP authorization anywhere yet (still unbuilt, out of
// scope of every phase including this one). Every other section here
// (enrollment, staff, attendance, fees, transport, hostel, inventory,
// library) is independently already authorized for VP by an earlier phase's
// own grant -- this is a real aggregate of data VP can already see in more
// detail elsewhere, not a new exposure.
//
// No filters, no pagination, no export -- the real backend endpoint takes no
// query params and has no export path; the same is true even for Principal's
// own web Reports page (no Download control there either), so VP correctly
// gets no export either.

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
  generatedAt: string;
}

export async function getReportsSummary(): Promise<ReportsSummary> {
  const res = await authedRequest<ApiEnvelope<ReportsSummary>>('/admin/reports-summary');
  return res.data;
}
