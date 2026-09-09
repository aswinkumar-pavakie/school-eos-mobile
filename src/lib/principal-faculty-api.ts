// Principal Faculty module -- list/designations/get/attendance-summary/
// timetable are re-exported unchanged from the VP module (identical
// class-level @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL') grant, confirmed
// by direct backend audit). Role assignments (Class Advisor / Academic
// Coordinator / Sports Faculty scope) are NEW here -- role-assignments.
// controller.ts's own class-level @Roles('ADMIN', 'PRINCIPAL') has NO
// VICE_PRINCIPAL on it, and list() carries no method-level override, so
// Principal genuinely has broader access here than VP, confirmed by reading
// the actual decorator, not assumed. This is the exact real endpoint
// Principal's own web faculty detail page already calls (its "Roles"
// section) -- read-only, no grant/revoke action (those stay ADMIN-only).

import { authedRequest } from './auth';

export {
  listFaculty,
  listDesignations,
  getFaculty,
  getAttendanceSummary,
  listTimetableSlots,
  type FacultyListRow,
  type FacultyListParams,
  type FacultyDetail,
  type AttendanceSummary,
  type TimetableSlot,
} from './vice-principal-faculty-api';

interface ApiEnvelope<T> {
  data: T;
}

export interface RoleAssignmentRow {
  id: string;
  personId: string;
  roleCode: string;
  scopeType: string;
  scopeId: string | null;
  scopeStage: string | null;
  academicYearId: string | null;
  validFrom: string;
  validTo: string | null;
  status: string;
  scopeName: string | null;
  academicYearName: string | null;
}

export async function listRoleAssignments(personId: string): Promise<RoleAssignmentRow[]> {
  const res = await authedRequest<ApiEnvelope<RoleAssignmentRow[]>>(`/role-assignments?personId=${personId}`);
  return res.data;
}
