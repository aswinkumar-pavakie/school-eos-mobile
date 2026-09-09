// Parent app's "Permissions" feature -- real backend calls only (school-eos-
// backend's src/modules/parent's ParentPermissionsController), every one going
// through authedRequest so a stale/expired access token is silently refreshed
// first. No mock/placeholder data anywhere in this file.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export type PermissionRequestState = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PermissionRequestListItem {
  id: string;
  eventId: string;
  eventName: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  gradeName: string | null;
  sectionName: string | null;
  state: PermissionRequestState;
  decidedAt: string | null;
  addedAt: string;
}

export async function listPermissionRequests(): Promise<PermissionRequestListItem[]> {
  const res = await authedRequest<ApiEnvelope<PermissionRequestListItem[]>>('/parent/permission-requests');
  return res.data;
}

export interface PermissionRequestDetail {
  participant: {
    id: string;
    state: PermissionRequestState;
    decidedAt: string | null;
  };
  event: {
    id: string;
    name: string;
    location: string;
    purpose: string;
    startsAt: string;
    endsAt: string;
    monitoringTeacherName: string;
    monitoringTeacherDesignation: string | null;
  };
}

export async function getPermissionRequest(id: string): Promise<PermissionRequestDetail> {
  const res = await authedRequest<ApiEnvelope<PermissionRequestDetail>>(`/parent/permission-requests/${id}`);
  return res.data;
}

export async function rejectPermissionRequest(id: string): Promise<void> {
  await authedRequest(`/parent/permission-requests/${id}/reject`, { method: 'POST' });
}

/** pngDataUrl is the base64 PNG the signature pad captured (react-native-svg's
 * own <Svg> ref.toDataURL()). Sent as a plain base64 string in a JSON body,
 * NOT a multipart file: React Native's own Blob implementation can only be
 * constructed from strings or other Blobs, not from raw bytes (a
 * Uint8Array/ArrayBuffer) -- attempting that throws "Creating blobs from
 * 'ArrayBuffer' and 'ArrayBufferView' are not supported" at runtime on a real
 * device, so a genuine multipart upload built from a captured signature was
 * never actually possible from this app. The backend decodes the base64
 * itself (see SignPermissionRequestDto). */
export async function signPermissionRequest(id: string, pngDataUrl: string): Promise<void> {
  const signaturePngBase64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');
  await authedRequest(`/parent/permission-requests/${id}/sign`, {
    method: 'POST',
    body: { signaturePngBase64 },
  });
}

export interface PermissionLetterPayload {
  state: string;
  decidedAt: string | null;
  event: { name: string; location: string; purpose: string; startsAt: string; endsAt: string };
  monitoringTeacher: { name: string; designation: string | null };
  student: { name: string; admissionNo: string; rollNo: number | null; gradeName: string | null; sectionName: string | null };
  classTeacherName: string | null;
  parent: { name: string | null; addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null; pincode: string | null };
  school: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    pincode: string | null;
    board: string | null;
    recognitionNo: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  } | null;
  signatureUrl: string | null;
}

export async function getPermissionLetter(id: string): Promise<PermissionLetterPayload> {
  const res = await authedRequest<ApiEnvelope<PermissionLetterPayload>>(`/parent/permission-requests/${id}/permission-letter`);
  return res.data;
}
