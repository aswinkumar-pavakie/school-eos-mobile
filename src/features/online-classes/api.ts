// Thin typed wrappers over the 11 verified Online Classes endpoints. Every call goes
// through authedRequest (src/lib/auth.ts) -- no separate HTTP client, no
// client-side authorization, no constructing a meetingUrl locally. The backend
// response envelope is always { data: T }.

import * as Crypto from 'expo-crypto';
import { authedRequest } from '@/lib/auth';
import type {
  CancelOnlineClassRequest,
  FacultyOnlineClass,
  OnlineClassView,
  ParentJoinResult,
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

export async function joinOnlineClass(id: string): Promise<ParentJoinResult> {
  const res = await authedRequest<Envelope<ParentJoinResult>>(`/online-classes/${id}/join`);
  return res.data;
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
