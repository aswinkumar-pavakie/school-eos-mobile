// Faculty app's "Events" feature -- real backend calls only (school-eos-
// backend's src/modules/student-events's StudentEventsController), every one
// going through authedRequest. No mock/placeholder data anywhere in this file.

import { authedRequest } from './auth';
import type { PermissionLetterPayload } from './permission-requests-api';

interface ApiEnvelope<T> {
  data: T;
}

export interface StudentEvent {
  id: string;
  name: string;
  location: string;
  purpose: string;
  startsAt: string;
  endsAt: string;
  monitoringTeacherPersonId: string;
  monitoringTeacherName: string;
  monitoringTeacherDesignation: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function listEvents(): Promise<StudentEvent[]> {
  const res = await authedRequest<ApiEnvelope<StudentEvent[]>>('/faculty/events');
  return res.data;
}

export async function createEvent(input: {
  name: string;
  location: string;
  purpose: string;
  monitoringTeacherPersonId: string;
  startsAt: string;
  endsAt: string;
}): Promise<StudentEvent> {
  const res = await authedRequest<ApiEnvelope<StudentEvent>>('/faculty/events', { method: 'POST', body: input });
  return res.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await authedRequest(`/faculty/events/${id}`, { method: 'DELETE' });
}

export type ParticipantState = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EventParticipant {
  id: string;
  eventId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  gradeName: string | null;
  sectionName: string | null;
  state: ParticipantState;
  decidedAt: string | null;
  addedAt: string;
}

export interface StudentEventDetail extends StudentEvent {
  participants: EventParticipant[];
}

export async function getEvent(id: string): Promise<StudentEventDetail> {
  const res = await authedRequest<ApiEnvelope<StudentEventDetail>>(`/faculty/events/${id}`);
  return res.data;
}

export async function addStudentToEvent(eventId: string, studentId: string): Promise<EventParticipant> {
  const res = await authedRequest<ApiEnvelope<EventParticipant>>(`/faculty/events/${eventId}/students`, {
    method: 'POST',
    body: { studentId },
  });
  return res.data;
}

export async function removeStudentFromEvent(eventId: string, participantId: string): Promise<void> {
  await authedRequest(`/faculty/events/${eventId}/students/${participantId}`, { method: 'DELETE' });
}

export async function getPermissionLetter(eventId: string, participantId: string): Promise<PermissionLetterPayload> {
  const res = await authedRequest<ApiEnvelope<PermissionLetterPayload>>(
    `/faculty/events/${eventId}/students/${participantId}/permission-letter`,
  );
  return res.data;
}

export interface StudentSearchResult {
  id: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  gradeId: string | null;
  gradeName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  rollNo: number | null;
}

export async function searchStudents(filter: { search?: string; gradeId?: string; sectionId?: string }): Promise<{
  data: StudentSearchResult[];
  meta: { total: number };
}> {
  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => !!v) as [string, string][]);
  return authedRequest(`/faculty/events/students-search?${qs.toString()}`);
}

export interface TeacherSearchResult {
  id: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
}

export async function searchTeachers(search: string): Promise<{ data: TeacherSearchResult[]; meta: { total: number } }> {
  const qs = new URLSearchParams(search ? { search } : {});
  return authedRequest(`/faculty/events/teachers-search?${qs.toString()}`);
}

export interface GradeOption {
  id: string;
  name: string;
}
export interface SectionOption {
  id: string;
  gradeId: string;
  name: string;
}

export async function listGrades(): Promise<GradeOption[]> {
  const res = await authedRequest<ApiEnvelope<GradeOption[]>>('/faculty/events/grades');
  return res.data;
}

export async function listSections(gradeId?: string): Promise<SectionOption[]> {
  const qs = gradeId ? `?gradeId=${encodeURIComponent(gradeId)}` : '';
  const res = await authedRequest<ApiEnvelope<SectionOption[]>>(`/faculty/events/sections${qs}`);
  return res.data;
}
