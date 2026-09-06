// Real response shapes for the Permission / Parent Consent backend
// (school-eos-backend/src/modules/permissions) -- mirrors PermissionActivityView,
// PermissionRequestDetailView, StatusSummary, FacultySectionDto and
// StudentRequestSummaryDto exactly, field-for-field.

export type PermissionRequestStatus = 'PENDING' | 'CONSENTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
export type PermissionActivityStatus = 'ACTIVE' | 'CANCELLED';
export type PermissionType =
  'ONE_TIME_ACTIVITY' | 'ANNUAL_CONSENT' | 'TERM_CONSENT' | 'MEDIA_CONSENT' | 'TRIP' | 'SPORTS' | 'OTHER';

export const PERMISSION_TYPES: PermissionType[] = [
  'ONE_TIME_ACTIVITY',
  'ANNUAL_CONSENT',
  'TERM_CONSENT',
  'MEDIA_CONSENT',
  'TRIP',
  'SPORTS',
  'OTHER',
];

export const PERMISSION_TYPE_LABELS: Record<PermissionType, string> = {
  ONE_TIME_ACTIVITY: 'One-time activity',
  ANNUAL_CONSENT: 'Annual consent',
  TERM_CONSENT: 'Term consent',
  MEDIA_CONSENT: 'Media consent',
  TRIP: 'Trip',
  SPORTS: 'Sports',
  OTHER: 'Other',
};

// Parent: GET /permissions/requests, GET /permissions/requests/:id,
// POST .../consent, POST .../decline
export interface PermissionRequestSummary {
  id: string;
  activityId: string;
  studentId: string;
  status: PermissionRequestStatus;
  respondedByPersonId: string | null;
  signedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
  studentFirstName: string;
  studentLastName: string;
  activityTitle: string;
  activityDescription: string | null;
  permissionType: PermissionType;
  activityDate: string;
  startTime: string;
  endTime: string;
  responseDeadline: string;
  activityStatus: PermissionActivityStatus;
  gradeName: string;
  sectionName: string;
  academicYearId: string;
  sectionId: string;
}

// Faculty: POST/GET /permissions/activities, GET/PATCH .../:id, POST .../cancel
export interface PermissionActivity {
  id: string;
  academicYearId: string;
  academicYearName: string;
  sectionId: string;
  sectionName: string;
  gradeName: string;
  createdByStaffId: string;
  title: string;
  description: string | null;
  permissionType: PermissionType;
  activityDate: string;
  startTime: string;
  endTime: string;
  responseDeadline: string;
  status: PermissionActivityStatus;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  studentCount: number;
}

export interface PermissionActivityStatusSummary {
  total: number;
  consented: number;
  declined: number;
  pending: number;
  expired: number;
  cancelled: number;
}

// Faculty: GET /permissions/activities/my-sections -- feeds the "Post request" picker
export interface FacultySection {
  sectionId: string;
  academicYearId: string;
  gradeName: string;
  sectionName: string;
}

// Faculty: GET /permissions/activities/:id/requests -- the "History" detail
export interface StudentRequestSummary {
  requestId: string;
  studentId: string;
  studentName: string;
  status: PermissionRequestStatus;
  responderName: string | null;
  signedAt: string | null;
  declineReason: string | null;
}

export interface CreatePermissionActivityInput {
  title: string;
  description?: string;
  permissionType: PermissionType;
  academicYearId: string;
  sectionId: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  responseDeadline: string;
  allStudents: boolean;
  studentIds?: string[];
}
