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
