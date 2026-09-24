// Shared "which classes am I scoped to" client -- every Faculty screen with a
// class-switcher calls through here, mirroring the backend's own
// FacultyScopeRepository (advisor sections vs teaching offerings are
// genuinely different scopes -- see that file's own header note).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface ScopedSection {
  sectionId: string;
  academicYearId: string;
  gradeName: string;
  sectionName: string;
}

export interface TeachingOffering {
  subjectOfferingId: string;
  sectionId: string;
  academicYearId: string;
  gradeName: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
}

export async function listAdvisorSections(): Promise<ScopedSection[]> {
  const res = await authedRequest<ApiEnvelope<ScopedSection[]>>('/faculty/scope/advisor-sections');
  return res.data;
}

export async function listTeachingOfferings(): Promise<TeachingOffering[]> {
  const res = await authedRequest<ApiEnvelope<TeachingOffering[]>>('/faculty/scope/teaching-offerings');
  return res.data;
}

export type ClassTeacherLink =
  | { hasClassTeacherLogin: false }
  | {
      hasClassTeacherLogin: true;
      gradeId: string;
      sectionName: string;
      /** Every class this faculty member advises, each with its own login email. */
      classes: { gradeId: string; gradeName: string; sectionName: string; email: string | null }[];
    };

/** Does this faculty member currently have a separate Class Teacher login to
 * switch into? See src/lib/auth.ts's linkAndSwitchIdentity. */
export async function getClassTeacherLink(): Promise<ClassTeacherLink> {
  const res = await authedRequest<ApiEnvelope<ClassTeacherLink>>('/faculty/scope/class-teacher-link');
  return res.data;
}

export interface FacultyCommutePrefs {
  isHosteller: boolean;
  usesSchoolTransport: boolean;
}

/** Drives BottomTabBar's conditional 5th Faculty tab -- Hostel (resides in
 * hostel), My Bus (uses school transport), or neither (self vehicle -- nav
 * drops to 4 tabs). Mutually exclusive by convention; isHosteller wins if
 * a data entry error somehow sets both. */
export async function getFacultyCommute(): Promise<FacultyCommutePrefs> {
  const res = await authedRequest<ApiEnvelope<FacultyCommutePrefs>>('/faculty/scope/commute');
  return res.data;
}
