// Parent Meetings -- real backend calls only (faculty/parent-meetings
// controller). Full CRUD on slots; booking creation is the Parent app's own
// feature (out of scope here) -- decide (approve/reject) is what this app
// wires.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface MeetingBooking {
  id: string;
  slotId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: number | null;
  gradeName: string | null;
  sectionName: string | null;
  requestedBy: string;
  parentName: string;
  parentPhone: string | null;
  notes: string | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface MeetingSlot {
  id: string;
  staffId: string;
  meetingDate: string;
  fromTime: string;
  toTime: string;
  createdAt: string;
  booking: MeetingBooking | null;
  pastBookings: MeetingBooking[];
}

export async function listMeetingSlots(): Promise<MeetingSlot[]> {
  const res = await authedRequest<ApiEnvelope<MeetingSlot[]>>('/faculty/parent-meetings/slots');
  return res.data;
}

export async function createMeetingSlot(input: { meetingDate: string; fromTime: string; toTime: string }): Promise<MeetingSlot> {
  const res = await authedRequest<ApiEnvelope<MeetingSlot>>('/faculty/parent-meetings/slots', { method: 'POST', body: input });
  return res.data;
}

export async function updateMeetingSlot(id: string, input: Partial<{ meetingDate: string; fromTime: string; toTime: string }>): Promise<MeetingSlot> {
  const res = await authedRequest<ApiEnvelope<MeetingSlot>>(`/faculty/parent-meetings/slots/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteMeetingSlot(id: string): Promise<void> {
  await authedRequest(`/faculty/parent-meetings/slots/${id}`, { method: 'DELETE' });
}

export async function decideMeetingBooking(bookingId: string, decision: 'APPROVED' | 'REJECTED'): Promise<MeetingBooking> {
  const res = await authedRequest<ApiEnvelope<MeetingBooking>>(`/faculty/parent-meetings/bookings/${bookingId}/decide`, {
    method: 'POST',
    body: { decision },
  });
  return res.data;
}

// ============================================================
// Parent side -- real parent-meetings.controller.ts. A slot here omits
// `pastBookings` (that's Faculty-only) but carries `facultyName` and this
// student's own active PENDING/APPROVED `booking`, if any -- the backend
// already scopes the list to slots relevant to this student's own faculty.
// ============================================================

export async function listParentMeetingSlots(studentId: string): Promise<(MeetingSlot & { facultyName: string })[]> {
  const res = await authedRequest<ApiEnvelope<(MeetingSlot & { facultyName: string })[]>>(`/parent/meeting-slots?studentId=${studentId}`);
  return res.data;
}

export async function createParentMeetingBooking(input: { slotId: string; studentId: string; notes?: string }): Promise<MeetingBooking> {
  const res = await authedRequest<ApiEnvelope<MeetingBooking>>('/parent/meeting-bookings', { method: 'POST', body: input });
  return res.data;
}
