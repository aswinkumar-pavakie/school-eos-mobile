// Vice Principal Parents module (Phase 5) -- every call here hits a REAL,
// pre-existing backend endpoint (parents.controller.ts), newly (and
// minimally) broadened to also allow VICE_PRINCIPAL -- see that controller's
// own comment. No new backend service, no duplicated Parent/guardian model.
// guardian-links.controller.ts (set-primary / revoke / relationship edit)
// was NOT touched and stays ADMIN-only -- this module is read-only, matching
// this phase's explicit "no relationship modification" instruction.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface ParentListRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string | null;
  status: string;
  childrenCount: number;
  photoUrl: string | null;
}

export interface ParentListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listParents(
  params: ParentListParams,
): Promise<{ data: ParentListRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<ParentListRow[]>>(`/parents?${query.toString()}`);
}

export interface LinkedStudentRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  studentAdmissionNo: string;
  studentPhotoUrl: string | null;
  gradeName: string | null;
  sectionName: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  isAuthorisedPickup: boolean;
  status: string;
}

export interface ParentDetail {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  mobile: string | null;
  status: string;
  photoUrl: string | null;
  children: LinkedStudentRow[];
}

/** The real endpoint also returns loginIdentifiers and resetAllowanceUsed
 * (account/security metadata) plus each child's occupation/annualIncomePaise
 * -- deliberately typed out here and never rendered by this module's own
 * screens, matching "sensitive/internal fields not unnecessarily exposed". */
export async function getParent(id: string): Promise<ParentDetail> {
  const res = await authedRequest<ApiEnvelope<ParentDetail>>(`/parents/${id}`);
  return res.data;
}
