// Academic Coordinator -- real backend calls only (faculty/academic-coordinator
// controller). Every write is re-validated server-side against the caller's
// real, live role_assignment scope regardless of what this client sends.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface CoordinatorGrade {
  gradeId: string;
  gradeName: string;
  levelNo: number;
  stage: string;
  sectionCount: number;
  studentCount: number;
}

export interface CoordinatorMe {
  isCoordinator: boolean;
  stages: string[];
  grades: CoordinatorGrade[];
}

export async function getCoordinatorMe(): Promise<CoordinatorMe> {
  const res = await authedRequest<ApiEnvelope<CoordinatorMe>>('/faculty/academic-coordinator/me');
  return res.data;
}

export interface CoordinatorDashboard {
  stages: string[];
  gradeCount: number;
  sectionCount: number;
  studentCount: number;
  subjectOfferingCount: number;
  facultyCount: number;
  unassignedOfferings: number;
  sectionsWithoutAdvisor: number;
}

export async function getCoordinatorDashboard(): Promise<CoordinatorDashboard> {
  const res = await authedRequest<ApiEnvelope<CoordinatorDashboard>>('/faculty/academic-coordinator/dashboard');
  return res.data;
}

export interface CoordinatorSection {
  sectionId: string;
  sectionName: string;
  gradeId: string;
  gradeName: string;
  studentCount: number;
  advisorRoleAssignmentId: string | null;
  advisorPersonId: string | null;
  advisorName: string | null;
}

export async function getCoordinatorStructure(): Promise<{ grades: CoordinatorGrade[]; sections: CoordinatorSection[] }> {
  const res = await authedRequest<ApiEnvelope<{ grades: CoordinatorGrade[]; sections: CoordinatorSection[] }>>('/faculty/academic-coordinator/structure');
  return res.data;
}

export async function getCoordinatorSections(gradeId?: string): Promise<CoordinatorSection[]> {
  const qs = gradeId ? `?gradeId=${gradeId}` : '';
  const res = await authedRequest<ApiEnvelope<CoordinatorSection[]>>(`/faculty/academic-coordinator/sections${qs}`);
  return res.data;
}

export interface CoordinatorOffering {
  subjectOfferingId: string;
  sectionId: string;
  gradeName: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  weeklyPeriods: number | null;
  teacherStaffId: string | null;
  teacherPersonId: string | null;
  teacherName: string | null;
}

export async function getCoordinatorOfferings(filter: { gradeId?: string; sectionId?: string } = {}): Promise<CoordinatorOffering[]> {
  const params = new URLSearchParams();
  if (filter.gradeId) params.set('gradeId', filter.gradeId);
  if (filter.sectionId) params.set('sectionId', filter.sectionId);
  const qs = params.toString();
  const res = await authedRequest<ApiEnvelope<CoordinatorOffering[]>>(`/faculty/academic-coordinator/offerings${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function assignOfferingTeacher(offeringId: string, teacherStaffId: string | null): Promise<CoordinatorOffering> {
  const res = await authedRequest<ApiEnvelope<CoordinatorOffering>>(`/faculty/academic-coordinator/offerings/${offeringId}/teacher`, {
    method: 'PATCH',
    body: { teacherStaffId },
  });
  return res.data;
}

export interface EligibleFaculty {
  staffId: string;
  personId: string;
  name: string;
  designation: string | null;
}

export async function getEligibleFaculty(): Promise<EligibleFaculty[]> {
  const res = await authedRequest<ApiEnvelope<EligibleFaculty[]>>('/faculty/academic-coordinator/eligible-faculty');
  return res.data;
}

export interface FacultyWorkload {
  staffId: string;
  personId: string;
  name: string;
  offeringCount: number;
  weeklyPeriods: number;
}

export async function getFacultyWorkload(): Promise<FacultyWorkload[]> {
  const res = await authedRequest<ApiEnvelope<FacultyWorkload[]>>('/faculty/academic-coordinator/faculty-workload');
  return res.data;
}

export async function assignClassAdvisor(sectionId: string, personId: string): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/sections/${sectionId}/advisor`, { method: 'POST', body: { personId } });
}

export async function revokeClassAdvisor(sectionId: string): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/sections/${sectionId}/advisor`, { method: 'DELETE' });
}

export interface CoordinatorTimetablePeriod {
  periodId: string;
  periodNo: number;
  label: string | null;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface CoordinatorTimetableSlot {
  slotId: string;
  periodId: string;
  periodNo: number;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  room: string | null;
  isDraft: boolean;
  subjectOfferingId: string;
  subjectName: string;
  teacherName: string | null;
}

export async function getCoordinatorTimetable(
  sectionId: string,
): Promise<{ section: CoordinatorSection; periods: CoordinatorTimetablePeriod[]; slots: CoordinatorTimetableSlot[] }> {
  const res = await authedRequest<ApiEnvelope<{ section: CoordinatorSection; periods: CoordinatorTimetablePeriod[]; slots: CoordinatorTimetableSlot[] }>>(
    `/faculty/academic-coordinator/timetable/${sectionId}`,
  );
  return res.data;
}

export async function upsertTimetableSlot(input: { sectionId: string; dayOfWeek: number; periodId: string; subjectOfferingId: string; room?: string }): Promise<{ slotId: string }> {
  const res = await authedRequest<ApiEnvelope<{ slotId: string }>>('/faculty/academic-coordinator/timetable/slots', { method: 'POST', body: input });
  return res.data;
}

export async function deleteTimetableSlot(slotId: string): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/timetable/slots/${slotId}`, { method: 'DELETE' });
}

export async function publishTimetable(sectionId: string): Promise<{ publishedSlotCount: number }> {
  const res = await authedRequest<ApiEnvelope<{ publishedSlotCount: number }>>(`/faculty/academic-coordinator/timetable/${sectionId}/publish`, { method: 'POST' });
  return res.data;
}

export interface CoordinatorExam {
  examId: string;
  name: string;
  examType: string;
  term: string | null;
  state: string;
  gradeNames: string[];
}

export async function listCoordinatorExams(): Promise<CoordinatorExam[]> {
  const res = await authedRequest<ApiEnvelope<CoordinatorExam[]>>('/faculty/academic-coordinator/exams');
  return res.data;
}

export async function createCoordinatorExam(input: { name: string; examType: string; term?: string; gradeIds: string[] }): Promise<{ examId: string }> {
  const res = await authedRequest<ApiEnvelope<{ examId: string }>>('/faculty/academic-coordinator/exams', { method: 'POST', body: input });
  return res.data;
}

export async function advanceExamState(examId: string): Promise<{ state: string }> {
  const res = await authedRequest<ApiEnvelope<{ state: string }>>(`/faculty/academic-coordinator/exams/${examId}/advance`, { method: 'POST' });
  return res.data;
}

export interface CoordinatorExamSubject {
  examSubjectId: string;
  examId: string;
  subjectOfferingId: string;
  subjectName: string;
  gradeName: string;
  sectionName: string;
  examDate: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  room: string | null;
  maxMarks: string;
  passMarks: string | null;
  hasPractical: boolean;
  practicalMax: string | null;
  internalMax: string | null;
}

export async function listExamSubjects(examId: string): Promise<CoordinatorExamSubject[]> {
  const res = await authedRequest<ApiEnvelope<CoordinatorExamSubject[]>>(`/faculty/academic-coordinator/exams/${examId}/subjects`);
  return res.data;
}

export async function createExamSubject(
  examId: string,
  input: { subjectOfferingId: string; examDate?: string; startTime?: string; durationMinutes?: number; room?: string; maxMarks: number; passMarks?: number },
): Promise<{ examSubjectId: string }> {
  const res = await authedRequest<ApiEnvelope<{ examSubjectId: string }>>(`/faculty/academic-coordinator/exams/${examId}/subjects`, { method: 'POST', body: input });
  return res.data;
}

export async function updateExamSubject(
  examSubjectId: string,
  input: Partial<{ examDate: string; startTime: string; durationMinutes: number; room: string; maxMarks: number; passMarks: number }>,
): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/exam-subjects/${examSubjectId}`, { method: 'PATCH', body: input });
}

export interface ExamReadinessRow extends CoordinatorExamSubject {
  expectedCount: number;
  enteredCount: number;
  verifiedCount: number;
}

export async function getExamReadiness(examId: string): Promise<ExamReadinessRow[]> {
  const res = await authedRequest<ApiEnvelope<ExamReadinessRow[]>>(`/faculty/academic-coordinator/exams/${examId}/readiness`);
  return res.data;
}

export interface CoordinatorCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  isHoliday: boolean;
  startDate: string;
  endDate: string;
  scopeType: string;
  scopeStage: string | null;
}

export async function listCoordinatorCalendarEvents(): Promise<CoordinatorCalendarEvent[]> {
  const res = await authedRequest<ApiEnvelope<CoordinatorCalendarEvent[]>>('/faculty/academic-coordinator/calendar');
  return res.data;
}

export async function createCoordinatorCalendarEvent(input: {
  scopeStage: string;
  title: string;
  description?: string;
  eventType: string;
  isHoliday?: boolean;
  startDate: string;
  endDate: string;
}): Promise<{ id: string }> {
  const res = await authedRequest<ApiEnvelope<{ id: string }>>('/faculty/academic-coordinator/calendar', { method: 'POST', body: input });
  return res.data;
}

export async function updateCoordinatorCalendarEvent(
  id: string,
  input: Partial<{ title: string; description: string; eventType: string; isHoliday: boolean; startDate: string; endDate: string }>,
): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/calendar/${id}`, { method: 'PATCH', body: input });
}

export async function deleteCoordinatorCalendarEvent(id: string): Promise<void> {
  await authedRequest(`/faculty/academic-coordinator/calendar/${id}`, { method: 'DELETE' });
}
