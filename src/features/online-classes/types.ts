// Types mirror the real backend response shapes exactly (see
// school-eos-backend/src/modules/online-classes/repositories/online-class.repository.ts
// -- OnlineClassDetail and ParentOnlineClassView -- and
// parent-online-classes.service.ts's ParentJoinResult). Do not add fields the backend
// doesn't send, and do not strip fields Faculty legitimately receives (Faculty's own
// detail response includes meetingCreationStatus/Error so they can see why a meeting
// failed to create -- the "never expose Google internals" rule is about the PARENT
// response shape, which structurally has no such fields at all).

export type OnlineClassStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type MeetingCreationStatus = 'PENDING' | 'CREATING' | 'SUCCEEDED' | 'FAILED';
export type OnlineClassView = 'upcoming' | 'completed' | 'cancelled';

// Fields both role-specific shapes share -- what shared display components (cards,
// detail header) key off of, regardless of which role is viewing.
export interface OnlineClassCommon {
  id: string;
  subjectName: string;
  gradeName: string;
  sectionName: string;
  topic: string;
  description: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: OnlineClassStatus;
  meetingUrl: string | null;
  recordingUrl: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /online-classes and GET /online-classes/:id, Faculty branch. Faculty owns the
// class, so this is the full row -- including Google bookkeeping fields, useful for
// Faculty to see e.g. why meeting creation failed.
export interface FacultyOnlineClass extends OnlineClassCommon {
  subjectOfferingId: string;
  facultyStaffId: string;
  meetingProvider: string;
  meetingCreationStatus: MeetingCreationStatus;
  meetingCreationError: string | null;
  googleCalendarEventId: string | null;
  googleMeetId: string | null;
  recordingAddedAt: string | null;
  cancelledAt: string | null;
  version: number;
}

export type FacultyOnlineClassListItem = FacultyOnlineClass;

// GET /online-classes and GET /online-classes/:id, Parent branch. Structurally
// narrower than Faculty's -- no facultyStaffId, no Google internals, no version/
// idempotency bookkeeping. This is ParentOnlineClassView from the backend, verbatim.
export type ParentOnlineClass = OnlineClassCommon;

export type ParentOnlineClassListItem = ParentOnlineClass;

// GET /online-classes/:id/join, PARENT only. Deliberately the narrowest possible
// response -- exactly {meetingUrl, status}, nothing else, matching
// ParentOnlineClassesService.join's real return shape.
export interface ParentJoinResult {
  meetingUrl: string;
  status: OnlineClassStatus;
}

// ---- Request bodies (Faculty writes) ----------------------------------------------

export interface ScheduleOnlineClassRequest {
  subjectOfferingId: string;
  topic: string;
  description?: string;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface RescheduleOnlineClassRequest {
  scheduledDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface CancelOnlineClassRequest {
  reason?: string;
}

export interface RecordingRequest {
  recordingUrl: string;
}

// GET /online-classes/my-subject-offerings, FACULTY only. Backs the Schedule form's
// class/section picker -- the caller's own ACTIVE subject offerings, resolved
// server-side from the authenticated staff.id (see backend README).
export interface TeachingSubjectOffering {
  id: string;
  subjectName: string;
  gradeName: string;
  sectionName: string;
}
