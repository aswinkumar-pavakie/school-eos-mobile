// Faculty Profile module -- same real, self-scoped GET /staff/me and
// GET /school this app's Principal/Vice Principal/Sports Admin Profile
// screens already use (staff.controller.ts / school.controller.ts), just
// missing FACULTY on both @Roles() lists until now -- see
// staff.controller.ts's own comment on GET /staff/me. Read-only, same as
// every other role's Profile screen: no self-service edit path exists in
// the real backend for any role.
//
// Extends the base StaffProfile shape (vice-principal-profile-api.ts) with
// the real qualification/training columns (highest_qualification,
// specialization, workshops_training, achievements_awards, etc.) -- these
// were already being selected by GET /staff/me specifically for Faculty's
// own Profile screen (see the website's own faculty-api.ts getMyStaffProfile
// for the same shape), just never rendered on mobile until now either.

import { authedRequest } from './auth';

export { getSchoolInfo, type SchoolInfo } from './vice-principal-profile-api';

interface ApiEnvelope<T> {
  data: T;
}

export interface FacultyStaffProfile {
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
  experienceYears: number | null;
  status: string;
  photoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  employmentType: string | null;
  staffRoom: string | null;
  bloodGroup: string | null;
  highestQualification: string | null;
  specialization: string | null;
  university: string | null;
  yearOfGraduation: number | null;
  tetNetCleared: boolean | null;
  areasOfExpertise: string | null;
  certifications: string | null;
  workshopsTraining: string | null;
  achievementsAwards: string | null;
}

export async function getMyStaffProfile(): Promise<FacultyStaffProfile> {
  const res = await authedRequest<ApiEnvelope<FacultyStaffProfile>>('/staff/me');
  return res.data;
}
