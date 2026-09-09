// Vice Principal Profile module (Phase 25) -- read-only. No self-service
// editing exists anywhere in the real backend for ANY role, VP included:
// the only person-update/photo-upload surface (persons.controller.ts) is
// ADMIN-only end to end (live-verified: VP gets 403 on both PATCH /staff/:id
// and POST /persons/:id/photo, including for their OWN record), and
// GET /auth/me / GET /staff/me / GET /school are all pure reads. Per this
// phase's own instruction ("If profile editing is not currently supported,
// implement a read-only profile rather than inventing a new profile-
// management system"), no edit UI was built -- inventing one would mean
// adding a new self-service write endpoint with its own new authorization
// model, which is a new capability, not a "smallest production-safe change."
//
// Name/email/roles come from the existing, shared, already-relied-upon
// useMe() hook (src/hooks/useMe.ts) -- reused directly by the screen, not
// duplicated here, per that hook's own documented warning about a second
// /auth/me query racing the shared ['me'] cache entry.
//
// Designation/employee no/photo/join date come from the NEW GET /staff/me
// (self-scoped to the caller's own personId server-side, never a client-
// supplied id -- see staff.controller.ts's own comment). School name/board/
// address/contact come from the NEW VICE_PRINCIPAL grant on the existing,
// already-real GET /school (Principal already had it since Phase 21 of the
// backend's own build).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface StaffProfile {
  id: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  employeeNo: string;
  designation: string | null;
  teacherCategory: string | null;
  postType: string | null;
  isTeaching: boolean;
  dateOfJoining: string;
  status: string;
  photoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export async function getMyStaffProfile(): Promise<StaffProfile> {
  const res = await authedRequest<ApiEnvelope<StaffProfile>>('/staff/me');
  return res.data;
}

export interface SchoolInfo {
  name: string;
  code: string;
  board: string;
  schoolType: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export async function getSchoolInfo(): Promise<SchoolInfo> {
  const res = await authedRequest<ApiEnvelope<SchoolInfo>>('/school');
  return res.data;
}
