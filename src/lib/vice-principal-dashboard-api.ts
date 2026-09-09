// Vice Principal dashboard (Phase 3) -- every call here hits a REAL, already-
// existing backend endpoint, each newly (and minimally) broadened to also
// allow VICE_PRINCIPAL where it wasn't already:
//   - /principal/dashboard-summary  (class-level: PRINCIPAL -> +VICE_PRINCIPAL)
//   - /examinations                 (method-level GET only: ADMIN -> +VICE_PRINCIPAL)
//   - /calendar-events               (class-level: ADMIN,PRINCIPAL -> +VICE_PRINCIPAL)
//   - /announcements                 (method-level GET only: ADMIN,PRINCIPAL -> +VICE_PRINCIPAL)
//   - /approvals                     (already open to any authenticated role --
//     server-side filters to whatever request types actually name VICE_PRINCIPAL
//     as an approver_role_code; currently none do, so this legitimately returns
//     an empty list until a later phase wires an approval type to Vice Principal)
// No new backend service, no duplicated data model -- see each controller's
// own comment for the exact reasoning. Response shapes match each endpoint's
// real repository row exactly (verified by reading the backend source this
// session), same convention as community-api.ts.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface DashboardSummary {
  activeStudents: number;
  activeStaff: number;
  currentAcademicYear: { id: string; name: string; startDate: string; endDate: string } | null;
  generatedAt: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await authedRequest<ApiEnvelope<DashboardSummary>>('/principal/dashboard-summary');
  return res.data;
}

export interface CalendarEventRow {
  id: string;
  academicYearId: string;
  title: string;
  description: string | null;
  eventType: string;
  isHoliday: boolean;
  startDate: string;
  endDate: string;
  scopeType: string;
  scopeId: string | null;
  scopeStage: string | null;
}

/** Query param is `fromDate`, not `from` -- this route is served by
 * modules/academic/calendar-events.controller.ts, NOT modules/calendar/'s own
 * (a pre-existing duplicate registration at the identical route; the academic/
 * one wins because AcademicModule is imported before CalendarModule in
 * app.module.ts, and it also happens to be the more complete implementation
 * -- update + scope validation + audit logging that the calendar/ one
 * lacks). Confirmed live against the real backend this session. */
export async function listUpcomingCalendarEvents(): Promise<CalendarEventRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await authedRequest<ApiEnvelope<CalendarEventRow[]>>(`/calendar-events?fromDate=${today}`);
  return res.data;
}

export interface ExamRow {
  id: string;
  name: string;
  examType: string;
  term: string | null;
  state: string;
  academicYearName: string;
  createdAt: string;
}

/** Optional params added for Phase 11's Examinations module (real, backend-
 * supported filters only -- ListExamsQueryDto takes exactly academicYearId
 * and state, nothing else). Backward compatible: called with no arguments
 * (as the Phase 3 dashboard still does) it's the exact same unfiltered call
 * as before. */
export async function listExaminations(params?: { academicYearId?: string; state?: string }): Promise<ExamRow[]> {
  const query = new URLSearchParams();
  if (params?.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params?.state) query.set('state', params.state);
  const qs = query.toString();
  const res = await authedRequest<ApiEnvelope<ExamRow[]>>(`/examinations${qs ? `?${qs}` : ''}`);
  return res.data;
}

export interface AnnouncementAudience {
  audienceType: string;
  targetId: string | null;
  targetStage: string | null;
  targetRole: string | null;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: string | null;
  priority: string;
  isEmergency: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  state: string;
  createdAt: string;
  audiences: AnnouncementAudience[];
}

export interface AnnouncementListParams {
  roleCode?: string;
  includeArchived?: boolean;
}

export async function listAnnouncements(params?: AnnouncementListParams): Promise<AnnouncementRow[]> {
  const query = new URLSearchParams();
  if (params?.roleCode) query.set('roleCode', params.roleCode);
  if (params?.includeArchived) query.set('includeArchived', 'true');
  const qs = query.toString();
  const res = await authedRequest<ApiEnvelope<AnnouncementRow[]>>(`/announcements${qs ? `?${qs}` : ''}`);
  return res.data;
}

export interface ApprovalRequestRow {
  id: string;
  requestType: string;
  subjectObjectType: string;
  subjectObjectId: string;
  requestedBy: string;
  requestedByName: string | null;
  payload: Record<string, unknown>;
  amountPaise: string | null;
  currentStep: number;
  state: string;
  dueAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Defaults to status=PENDING server-side (ApprovalsService.listForCaller) --
 * no query param needed for the dashboard's own "pending" use case. */
export async function listPendingApprovals(): Promise<ApprovalRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<ApprovalRequestRow[]>>('/approvals');
  return res.data;
}

export interface ApprovalListParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType?: string;
}

/** Same real GET /approvals endpoint listPendingApprovals() already uses --
 * this just exposes its real status/requestType filters (ApprovalsService.
 * listForCaller / ListApprovalsQueryDto) for a full Requests & Approvals
 * screen rather than only the dashboard's own bare "pending" call. */
export async function listApprovals(params?: ApprovalListParams): Promise<ApprovalRequestRow[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.requestType) query.set('requestType', params.requestType);
  const qs = query.toString();
  const res = await authedRequest<ApiEnvelope<ApprovalRequestRow[]>>(`/approvals${qs ? `?${qs}` : ''}`);
  return res.data;
}

export interface ApprovalStepRow {
  id: string;
  requestId: string;
  sequenceNo: number;
  approverRoleCode: string;
  decidedBy: string | null;
  decision: string | null;
  comment: string | null;
  decidedAt: string | null;
}

export interface ApprovalRequestDetail {
  request: ApprovalRequestRow;
  steps: ApprovalStepRow[];
}

/** GET /approvals/:id -- server-side view authorization (ApprovalsService.
 * assertCallerMayView): the requester, FINANCE/ADMIN, or a caller whose role
 * matches one of this request's own steps. Returns 403 for anyone else --
 * never trust a client-supplied ID as proof of access. */
export async function getApprovalRequest(id: string): Promise<ApprovalRequestDetail> {
  const res = await authedRequest<ApiEnvelope<ApprovalRequestDetail>>(`/approvals/${id}`);
  return res.data;
}
