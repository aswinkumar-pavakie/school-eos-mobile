// Thin typed wrappers over the Permission / Parent Consent endpoints -- mirrors
// messaging/api.ts exactly. Every call goes through authedRequest; the backend
// derives actor identity from the JWT, never from a client-supplied id.

import { authedRequest } from '@/lib/auth';
import type {
  CreatePermissionActivityInput,
  FacultySection,
  PermissionActivity,
  PermissionActivityStatusSummary,
  PermissionRequestSummary,
  StudentRequestSummary,
} from './types';

interface Envelope<T> {
  data: T;
}

// ---- Parent ------------------------------------------------------------------------

export async function fetchPermissionRequests(): Promise<PermissionRequestSummary[]> {
  const res = await authedRequest<Envelope<PermissionRequestSummary[]>>('/permissions/requests');
  return res.data;
}

export async function fetchPermissionRequestDetail(id: string): Promise<PermissionRequestSummary> {
  const res = await authedRequest<Envelope<PermissionRequestSummary>>(`/permissions/requests/${id}`);
  return res.data;
}

export async function consentPermissionRequest(id: string): Promise<PermissionRequestSummary> {
  const res = await authedRequest<Envelope<PermissionRequestSummary>>(`/permissions/requests/${id}/consent`, {
    method: 'POST',
  });
  return res.data;
}

export async function declinePermissionRequest(id: string, reason?: string): Promise<PermissionRequestSummary> {
  const res = await authedRequest<Envelope<PermissionRequestSummary>>(`/permissions/requests/${id}/decline`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
  return res.data;
}

// ---- Faculty ------------------------------------------------------------------------

export async function fetchPermissionActivities(): Promise<PermissionActivity[]> {
  const res = await authedRequest<Envelope<PermissionActivity[]>>('/permissions/activities');
  return res.data;
}

export async function fetchPermissionActivityStatus(id: string): Promise<PermissionActivityStatusSummary> {
  const res = await authedRequest<Envelope<PermissionActivityStatusSummary>>(`/permissions/activities/${id}/status`);
  return res.data;
}

export async function fetchPermissionActivityRequests(id: string): Promise<StudentRequestSummary[]> {
  const res = await authedRequest<Envelope<StudentRequestSummary[]>>(`/permissions/activities/${id}/requests`);
  return res.data;
}

export async function fetchMyPermissionSections(): Promise<FacultySection[]> {
  const res = await authedRequest<Envelope<FacultySection[]>>('/permissions/activities/my-sections');
  return res.data;
}

export async function createPermissionActivity(input: CreatePermissionActivityInput): Promise<PermissionActivity> {
  const res = await authedRequest<Envelope<PermissionActivity>>('/permissions/activities', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export async function cancelPermissionActivity(id: string): Promise<PermissionActivity> {
  const res = await authedRequest<Envelope<PermissionActivity>>(`/permissions/activities/${id}/cancel`, {
    method: 'POST',
  });
  return res.data;
}
