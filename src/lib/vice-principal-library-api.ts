// Vice Principal Library module (Phase 16) -- a SINGLE overview endpoint,
// deliberately. GET /library/overview is newly (and minimally) broadened to
// also allow VICE_PRINCIPAL -- see that controller's own comment, which
// documents (and this session independently verified against the website's
// own admin/library/page.tsx) that this is deliberately the ONLY Library
// surface any oversight role gets -- Admin's own leadership oversight page
// calls nothing else either. Books/circulation/members/reservations/fines/
// lost-damaged/reports/config/audit were all deliberately left untouched to
// match that same existing, documented architectural boundary -- this is
// not a gap, it's an intentional design decision already made elsewhere in
// this codebase, and this phase respects it rather than overriding it.
//
// pendingFinesAmountPaise/sentToFinanceFinesAmountPaise are deliberately
// never rendered by this module's screen (financial data, out of scope,
// same pattern as every prior phase's own field-level exclusions).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface LibraryActivityRow {
  id: string;
  action: string;
  detail: string | null;
  occurredAt: string;
}

export interface LibraryOverview {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  reservedCopies: number;
  overdueCount: number;
  lostCopies: number;
  damagedCopies: number;
  underRepairCopies: number;
  retiredCopies: number;
  activeMembers: number;
  pendingReservationsCount: number;
  readyReservationsCount: number;
  recentActivity: LibraryActivityRow[];
}

export async function getLibraryOverview(): Promise<LibraryOverview> {
  const res = await authedRequest<ApiEnvelope<LibraryOverview>>('/library/overview');
  return res.data;
}
