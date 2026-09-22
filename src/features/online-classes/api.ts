// Thin typed wrappers over the Online Classes endpoints. Every call goes through
// authedRequest (src/lib/auth.ts) -- no separate HTTP client, no client-side
// authorization. The backend response envelope is always { data: T }.
//
// Join/Start now mint an in-app LiveKit token (requestOnlineClassCallToken) instead
// of the old GET :id/join returning an external Google Meet meetingUrl -- that
// endpoint no longer exists on the backend (see online-class-call feature for the
// actual call screen, shared with Faculty's Start/Resume and Parent's Join).

import * as Crypto from 'expo-crypto';
import { authedRequest } from '@/lib/auth';
import type {
  CancelOnlineClassRequest,
  FacultyOnlineClass,
  OnlineClassView,
  ParentOnlineClass,
  RecordingRequest,
  RescheduleOnlineClassRequest,
  TeachingSubjectOffering,
  ScheduleOnlineClassRequest,
} from './types';

interface Envelope<T> {
  data: T;
}

export async function fetchOnlineClasses(
  view: OnlineClassView,
): Promise<(FacultyOnlineClass | ParentOnlineClass)[]> {
  const res = await authedRequest<Envelope<(FacultyOnlineClass | ParentOnlineClass)[]>>(
    `/online-classes?view=${view}`,
  );
  return res.data;
}

export async function fetchOnlineClassDetail(id: string): Promise<FacultyOnlineClass | ParentOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass | ParentOnlineClass>>(`/online-classes/${id}`);
  return res.data;
}

export interface OnlineClassCallCredentials {
  url: string;
  token: string;
  roomName: string;
}

/** Faculty "Start"/"Resume" AND Parent "Join" -- same endpoint, the backend branches
 * on the caller's role (see the website's identical online-class-call/actions.ts
 * comment for why this MUST be one endpoint, not two, given Nest's routing). */
export async function requestOnlineClassCallToken(id: string): Promise<OnlineClassCallCredentials> {
  const res = await authedRequest<Envelope<OnlineClassCallCredentials>>(`/online-classes/${id}/call-token`, {
    method: 'POST',
  });
  return res.data;
}

/** Faculty-only -- ends the call for everyone and transitions LIVE -> COMPLETED. */
export async function endOnlineClassCall(id: string): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/end-call`, {
    method: 'POST',
  });
  return res.data;
}

/** Faculty-only roster moderation from inside the call -- identity is exactly what
 * LiveKit reports for that participant. */
export async function muteOnlineClassParticipant(id: string, identity: string, muted: boolean): Promise<void> {
  await authedRequest(`/online-classes/${id}/participants/mute`, {
    method: 'POST',
    body: { identity, muted },
  });
}

// Faculty-only writes below. The backend requires a fresh Idempotency-Key per new
// schedule attempt (composite-unique on faculty_staff_id+key) -- generated here per
// submission, never reused across retries of the SAME logical submission from the
// caller's side beyond what react-query's own mutation retry does.
export async function scheduleOnlineClass(body: ScheduleOnlineClassRequest): Promise<FacultyOnlineClass> {
  const idempotencyKey = Crypto.randomUUID();
  const res = await authedRequest<Envelope<FacultyOnlineClass>>('/online-classes', {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return res.data;
}

export async function rescheduleOnlineClass(
  id: string,
  body: RescheduleOnlineClassRequest,
): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/reschedule`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function cancelOnlineClass(id: string, body: CancelOnlineClassRequest): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/cancel`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function startOnlineClass(id: string): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/start`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function completeOnlineClass(id: string): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/complete`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function addOnlineClassRecording(id: string, body: RecordingRequest): Promise<FacultyOnlineClass> {
  const res = await authedRequest<Envelope<FacultyOnlineClass>>(`/online-classes/${id}/recording`, {
    method: 'PATCH',
    body,
  });
  return res.data;
}

export async function fetchMyTeachingOfferings(): Promise<TeachingSubjectOffering[]> {
  const res = await authedRequest<Envelope<TeachingSubjectOffering[]>>('/online-classes/my-subject-offerings');
  return res.data;
}
