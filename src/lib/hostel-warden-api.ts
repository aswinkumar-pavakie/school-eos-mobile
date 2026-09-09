// Hostel Warden app -- real backend calls only (school-eos-backend's
// src/modules/hostel-warden + src/modules/hostel's read-only repositories),
// every one going through authedRequest. Types match the backend's actual
// repository row shapes exactly (verified by reading the backend source and by
// live E2E testing against a real dev server), not guessed from the task brief.
//
// Parent-initiated creation (gate-pass-requests, emergency-exit-requests,
// call-requests under /parent/hostel/*) intentionally has NO functions here --
// the Warden app only reviews those requests, never creates them. See
// parent-hostel-requests.controller.ts / parent-call-requests.controller.ts on
// the backend for the parent-side creation endpoints this app must never call.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

// ---- Night Attendance -------------------------------------------------------------

export type NightAttendanceStatus = 'PRESENT' | 'ABSENT';

export interface NightAttendanceRosterRow {
  studentId: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  roomNo: string | null;
  bedNo: string | null;
  blockId: string | null;
  blockName: string | null;
  floorNo: number | null;
  attendanceId: string | null;
  status: NightAttendanceStatus | null;
  recordedAt: string | null;
  hasApprovedLeaveToday: boolean;
}

export async function getNightAttendanceRoster(date: string): Promise<NightAttendanceRosterRow[]> {
  const res = await authedRequest<ApiEnvelope<NightAttendanceRosterRow[]>>(
    `/hostel/night-attendance?date=${encodeURIComponent(date)}`,
  );
  return res.data;
}

export async function markNightAttendance(
  date: string,
  entries: { studentId: string; status: NightAttendanceStatus }[],
): Promise<{ marked: number; date: string }> {
  const res = await authedRequest<ApiEnvelope<{ marked: number; date: string }>>('/hostel/night-attendance', {
    method: 'POST',
    body: { date, entries },
  });
  return res.data;
}

// ---- Study Attendance --------------------------------------------------------------

export interface StudySessionSummary {
  id: string;
  hostelId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  createdByStaffId: string | null;
  isLocked: boolean;
  createdAt: string;
}

export interface StudyAttendanceRosterRow {
  studentId: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  attendanceId: string | null;
  status: NightAttendanceStatus | null;
  recordedAt: string | null;
}

export async function listStudySessions(): Promise<StudySessionSummary[]> {
  const res = await authedRequest<ApiEnvelope<StudySessionSummary[]>>('/hostel/study-sessions');
  return res.data;
}

export async function createStudySession(input: {
  sessionDate: string;
  startTime: string;
  endTime: string;
}): Promise<StudySessionSummary> {
  const res = await authedRequest<ApiEnvelope<StudySessionSummary>>('/hostel/study-sessions', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function getStudySessionRoster(
  sessionId: string,
): Promise<{ session: StudySessionSummary; roster: StudyAttendanceRosterRow[] }> {
  const res = await authedRequest<ApiEnvelope<{ session: StudySessionSummary; roster: StudyAttendanceRosterRow[] }>>(
    `/hostel/study-sessions/${sessionId}/attendance`,
  );
  return res.data;
}

export async function markStudyAttendance(
  sessionId: string,
  entries: { studentId: string; status: NightAttendanceStatus }[],
): Promise<{ marked: number }> {
  const res = await authedRequest<ApiEnvelope<{ marked: number }>>(`/hostel/study-sessions/${sessionId}/attendance`, {
    method: 'POST',
    body: { entries },
  });
  return res.data;
}

// ---- Gate Pass / Emergency Exit (both backed by outing_request) -------------------

export interface OutingRequestRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  requestedBy: string | null;
  requestedAt: string;
  outFrom: string;
  expectedReturn: string;
  isOvernight: boolean;
  reason: string;
  destination: string | null;
  approvalRequestId: string | null;
  state: string;
  requestType: string | null;
}

async function listOutingRequests(kind: 'gate-pass-requests' | 'emergency-exit-requests'): Promise<OutingRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow[]>>(`/hostel/${kind}`);
  return res.data;
}

async function getOutingRequest(
  kind: 'gate-pass-requests' | 'emergency-exit-requests',
  id: string,
): Promise<OutingRequestRow> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow>>(`/hostel/${kind}/${id}`);
  return res.data;
}

async function decideOutingRequest(
  kind: 'gate-pass-requests' | 'emergency-exit-requests',
  id: string,
  decision: 'approve' | 'reject',
  comment: string | undefined,
): Promise<OutingRequestRow> {
  const res = await authedRequest<ApiEnvelope<OutingRequestRow>>(`/hostel/${kind}/${id}/${decision}`, {
    method: 'POST',
    body: comment !== undefined ? { comment } : {},
  });
  return res.data;
}

export const listGatePassRequests = () => listOutingRequests('gate-pass-requests');
export const getGatePassRequest = (id: string) => getOutingRequest('gate-pass-requests', id);
export const approveGatePassRequest = (id: string, comment?: string) =>
  decideOutingRequest('gate-pass-requests', id, 'approve', comment);
// Reject requires a comment on the backend (RejectApprovalDto) -- never optional here.
export const rejectGatePassRequest = (id: string, comment: string) =>
  decideOutingRequest('gate-pass-requests', id, 'reject', comment);

export const listEmergencyExitRequests = () => listOutingRequests('emergency-exit-requests');
export const getEmergencyExitRequest = (id: string) => getOutingRequest('emergency-exit-requests', id);
export const approveEmergencyExitRequest = (id: string, comment?: string) =>
  decideOutingRequest('emergency-exit-requests', id, 'approve', comment);
export const rejectEmergencyExitRequest = (id: string, comment: string) =>
  decideOutingRequest('emergency-exit-requests', id, 'reject', comment);

// ---- Call Requests -----------------------------------------------------------------

export type CallRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CallRequestRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  parentPersonId: string;
  hostelId: string;
  requestedFrom: string;
  requestedTo: string;
  status: CallRequestStatus;
  approvedFrom: string | null;
  approvedTo: string | null;
  decidedByPersonId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listCallRequests(): Promise<CallRequestRow[]> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow[]>>('/hostel/call-requests');
  return res.data;
}

export async function getCallRequest(id: string): Promise<CallRequestRow> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow>>(`/hostel/call-requests/${id}`);
  return res.data;
}

export async function approveCallRequest(
  id: string,
  window: { approvedFrom: string; approvedTo: string },
): Promise<CallRequestRow> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow>>(`/hostel/call-requests/${id}/approve`, {
    method: 'POST',
    body: window,
  });
  return res.data;
}

export async function rejectCallRequest(id: string): Promise<CallRequestRow> {
  const res = await authedRequest<ApiEnvelope<CallRequestRow>>(`/hostel/call-requests/${id}/reject`, {
    method: 'POST',
  });
  return res.data;
}

// ---- Visitor Log ---------------------------------------------------------------------

export interface VisitorRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  visitorName: string;
  relationship: string | null;
  idProofRef: string | null;
  phone: string | null;
  enteredAt: string;
  exitedAt: string | null;
  recordedBy: string | null;
}

export async function listVisitors(status?: 'open'): Promise<VisitorRow[]> {
  const res = await authedRequest<ApiEnvelope<VisitorRow[]>>(
    `/hostel/visitors${status ? `?status=${status}` : ''}`,
  );
  return res.data;
}

export async function getVisitor(id: string): Promise<VisitorRow> {
  const res = await authedRequest<ApiEnvelope<VisitorRow>>(`/hostel/visitors/${id}`);
  return res.data;
}

export async function createVisitor(input: {
  studentId: string;
  visitorName: string;
  relationship?: string;
  idProofRef?: string;
  phone?: string;
}): Promise<VisitorRow> {
  const res = await authedRequest<ApiEnvelope<VisitorRow>>('/hostel/visitors', { method: 'POST', body: input });
  return res.data;
}

export async function exitVisitor(id: string): Promise<VisitorRow> {
  const res = await authedRequest<ApiEnvelope<VisitorRow>>(`/hostel/visitors/${id}/exit`, { method: 'POST' });
  return res.data;
}

// ---- Class Absence Alerts (read-only) -----------------------------------------------

export interface ClassAbsenceAlertRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  title: string;
  body: string;
  createdAt: string;
}

export async function listClassAbsenceAlerts(date?: string): Promise<ClassAbsenceAlertRow[]> {
  const res = await authedRequest<ApiEnvelope<ClassAbsenceAlertRow[]>>(
    `/hostel/class-absence-alerts${date ? `?date=${encodeURIComponent(date)}` : ''}`,
  );
  return res.data;
}

// ---- Room & Bed View (read-only) -----------------------------------------------------

export interface HostelAllocationRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  stateStudentId: string | null;
  rollNo: number | null;
  photoUrl: string | null;
  bedId: string;
  bedNo: string;
  roomId: string;
  roomNo: string;
  floorNo: number;
  blockId: string;
  blockName: string;
  hostelName: string;
  gradeName: string | null;
  sectionName: string | null;
  academicYearId: string;
  allocatedFrom: string;
  allocatedTo: string | null;
  allocatedBy: string | null;
  status: string;
}

export async function listRoomAllocations(): Promise<HostelAllocationRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelAllocationRow[]>>('/hostel/room-allocations');
  return res.data;
}

export async function getStudentRoom(studentId: string): Promise<HostelAllocationRow> {
  const res = await authedRequest<ApiEnvelope<HostelAllocationRow>>(`/hostel/students/${studentId}/room`);
  return res.data;
}

export interface StudentGuardianRow {
  personId: string;
  firstName: string;
  lastName: string | null;
  relationship: string;
  isPrimaryContact: boolean;
  mobile: string | null;
  photoUrl: string | null;
}

export async function listStudentGuardians(studentId: string): Promise<StudentGuardianRow[]> {
  const res = await authedRequest<ApiEnvelope<StudentGuardianRow[]>>(`/hostel/students/${studentId}/guardians`);
  return res.data;
}

export interface HostelStructureRoom {
  id: string;
  roomNo: string;
  floorNo: number;
}

export interface HostelStructureBlock {
  id: string;
  name: string;
  rooms: HostelStructureRoom[];
}

// Feeds the Hostel Complaints form's block/room picker with real ids (complaint.
// block_id/room_id are real FKs, not free text) -- scoped server-side to the
// Warden's own hostel(s).
export async function listHostelStructure(): Promise<HostelStructureBlock[]> {
  const res = await authedRequest<ApiEnvelope<HostelStructureBlock[]>>('/hostel/blocks');
  return res.data;
}

// ---- Hostel Complaints ---------------------------------------------------------------

// Matches complaint.category's real, live CHECK constraint's use here -- every hostel
// complaint's finer-grained kind is `issueType`, not `category` (see the backend DTO's
// own comment for why). Keep this list in sync with
// school-eos-backend's create-hostel-complaint.dto.ts HOSTEL_ISSUE_TYPES.
export const HOSTEL_ISSUE_TYPES = [
  'ELECTRICAL',
  'PLUMBING',
  'WATER_LEAKAGE',
  'BATHROOM',
  'FURNITURE_DAMAGE',
  'CLEANING',
  'OTHER',
] as const;
export type HostelIssueType = (typeof HOSTEL_ISSUE_TYPES)[number];

export const HOSTEL_ISSUE_TYPE_LABELS: Record<HostelIssueType, string> = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  WATER_LEAKAGE: 'Water leakage',
  BATHROOM: 'Bathroom',
  FURNITURE_DAMAGE: 'Furniture damage',
  CLEANING: 'Cleaning',
  OTHER: 'Other',
};

// Matches complaint.state's real, live CHECK constraint exactly -- no ASSIGNED value
// exists on the real table. Keep in sync with update-hostel-complaint.dto.ts.
export const HOSTEL_COMPLAINT_STATES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REJECTED'] as const;
export type HostelComplaintState = (typeof HOSTEL_COMPLAINT_STATES)[number];

// Mirrors ComplaintsService's own ALLOWED_TRANSITIONS on the backend exactly, so the
// UI only ever offers a transition the backend will actually accept -- the backend
// remains the source of truth (a 409 is still handled if this ever drifts), but this
// avoids a Warden hitting a "cannot move" error for a clearly-invalid choice.
export const HOSTEL_COMPLAINT_ALLOWED_TRANSITIONS: Record<HostelComplaintState, HostelComplaintState[]> = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'REJECTED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
};

export interface HostelComplaintRow {
  id: string;
  hostelId: string;
  blockId: string | null;
  roomId: string | null;
  issueType: string;
  subject: string;
  description: string;
  raisedByPersonId: string | null;
  assignedTo: string | null;
  state: HostelComplaintState;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listComplaints(): Promise<HostelComplaintRow[]> {
  const res = await authedRequest<ApiEnvelope<HostelComplaintRow[]>>('/hostel/complaints');
  return res.data;
}

export async function getComplaint(id: string): Promise<HostelComplaintRow> {
  const res = await authedRequest<ApiEnvelope<HostelComplaintRow>>(`/hostel/complaints/${id}`);
  return res.data;
}

export async function createComplaint(input: {
  issueType: HostelIssueType;
  subject: string;
  description: string;
  blockId?: string;
  roomId?: string;
}): Promise<HostelComplaintRow> {
  const res = await authedRequest<ApiEnvelope<HostelComplaintRow>>('/hostel/complaints', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function updateComplaintStatus(id: string, state: HostelComplaintState): Promise<HostelComplaintRow> {
  const res = await authedRequest<ApiEnvelope<HostelComplaintRow>>(`/hostel/complaints/${id}`, {
    method: 'PATCH',
    body: { state },
  });
  return res.data;
}
