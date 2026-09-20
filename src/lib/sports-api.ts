// Sports Admin mobile module -- calls the exact same real backend the
// website's Sports Admin console already uses (school-eos-backend's
// src/modules/sports, broadened for SPORTS_ADMIN this same project phase).
// Same authedRequest/ApiEnvelope convention every other *-api.ts file in
// this app uses. No mock/placeholder data anywhere in this file.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

// ---------- Sports master data ----------

export interface Sport {
  id: string;
  name: string;
  sportType: string;
  resultType: string;
  status: string;
}
export async function listSports(): Promise<Sport[]> {
  const res = await authedRequest<ApiEnvelope<Sport[]>>('/sports');
  return res.data;
}

export interface SportCategory {
  id: string;
  sportId: string;
  name: string;
  ageGroup: string | null;
  gender: string | null;
}
export async function listSportCategories(sportId: string): Promise<SportCategory[]> {
  const res = await authedRequest<ApiEnvelope<SportCategory[]>>(`/sports/${sportId}/categories`);
  return res.data;
}

// ---------- Teams / squads + roster ----------

export interface SportsTeam {
  id: string;
  sportId: string;
  sportName: string;
  sportCategoryId: string | null;
  academicYearId: string;
  name: string;
  coachId: string | null;
  captainStudentId: string | null;
  houseId: string | null;
  status: string;
}
export async function listMyTeams(): Promise<SportsTeam[]> {
  const res = await authedRequest<ApiEnvelope<SportsTeam[]>>('/sports/teams');
  return res.data;
}
export async function getTeam(id: string): Promise<SportsTeam> {
  const res = await authedRequest<ApiEnvelope<SportsTeam>>(`/sports/teams/${id}`);
  return res.data;
}
export async function createTeam(input: {
  sportId: string;
  sportCategoryId?: string;
  academicYearId: string;
  name: string;
  coachId?: string;
}): Promise<SportsTeam> {
  const res = await authedRequest<ApiEnvelope<SportsTeam>>('/sports/teams', { method: 'POST', body: input });
  return res.data;
}
export async function assignCoach(teamId: string, coachId: string): Promise<SportsTeam> {
  const res = await authedRequest<ApiEnvelope<SportsTeam>>(`/sports/teams/${teamId}/coach`, { method: 'POST', body: { coachId } });
  return res.data;
}

export interface TeamRosterMember {
  id: string;
  teamId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  jerseyNo: number | null;
  role: string | null;
  joinedOn: string;
  status: string;
}
export async function listTeamRoster(teamId: string): Promise<TeamRosterMember[]> {
  const res = await authedRequest<ApiEnvelope<TeamRosterMember[]>>(`/sports/teams/${teamId}/roster`);
  return res.data;
}
export async function addRosterMember(teamId: string, input: { studentId: string; jerseyNo?: number; role?: string }): Promise<TeamRosterMember> {
  const res = await authedRequest<ApiEnvelope<TeamRosterMember>>(`/sports/teams/${teamId}/roster`, { method: 'POST', body: input });
  return res.data;
}
export async function endRosterMember(teamId: string, memberId: string): Promise<void> {
  await authedRequest(`/sports/teams/${teamId}/roster/${memberId}/end`, { method: 'POST' });
}

// ---------- Training sessions ----------

export interface TrainingSession {
  id: string;
  teamId: string;
  teamName: string;
  sportId: string;
  scheduledAt: string;
  venue: string | null;
  focus: string | null;
  conductedByCoachId: string | null;
  status: string;
}
export async function listTrainingSessions(): Promise<TrainingSession[]> {
  const res = await authedRequest<ApiEnvelope<TrainingSession[]>>('/sports/training-sessions');
  return res.data;
}
export async function createTrainingSession(input: { teamId: string; scheduledAt: string; venue?: string; focus?: string; conductedByCoachId?: string }): Promise<TrainingSession> {
  const res = await authedRequest<ApiEnvelope<TrainingSession>>('/sports/training-sessions', { method: 'POST', body: input });
  return res.data;
}

export interface TrainingAttendanceEntry {
  id: string;
  trainingSessionId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  status: string;
}
export async function listTrainingAttendance(sessionId: string): Promise<TrainingAttendanceEntry[]> {
  const res = await authedRequest<ApiEnvelope<TrainingAttendanceEntry[]>>(`/sports/training-sessions/${sessionId}/attendance`);
  return res.data;
}
export async function recordTrainingAttendance(sessionId: string, entries: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' }[]): Promise<TrainingAttendanceEntry[]> {
  const res = await authedRequest<ApiEnvelope<TrainingAttendanceEntry[]>>(`/sports/training-sessions/${sessionId}/attendance`, { method: 'POST', body: { entries } });
  return res.data;
}

// ---------- Tournaments & fixtures ----------

export interface Tournament {
  id: string;
  sportId: string;
  sportName: string;
  name: string;
  level: string;
  format: string | null;
  startDate: string;
  endDate: string;
  venue: string | null;
  state: string;
}
export async function listTournaments(): Promise<Tournament[]> {
  const res = await authedRequest<ApiEnvelope<Tournament[]>>('/sports/tournaments');
  return res.data;
}
export async function createTournament(input: { sportId: string; name: string; level: string; startDate: string; endDate: string; venue?: string; format?: string }): Promise<Tournament> {
  const res = await authedRequest<ApiEnvelope<Tournament>>('/sports/tournaments', { method: 'POST', body: input });
  return res.data;
}

export interface Fixture {
  id: string;
  tournamentId: string;
  sportId: string;
  round: string | null;
  scheduledAt: string;
  venue: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: string;
}
export async function listFixtures(): Promise<Fixture[]> {
  const res = await authedRequest<ApiEnvelope<Fixture[]>>('/sports/fixtures');
  return res.data;
}
export async function createFixture(tournamentId: string, input: { round?: string; scheduledAt: string; venue?: string; homeTeamId?: string; awayTeamId?: string }): Promise<Fixture> {
  const res = await authedRequest<ApiEnvelope<Fixture>>(`/sports/tournaments/${tournamentId}/fixtures`, { method: 'POST', body: input });
  return res.data;
}
export async function recordFixtureResult(id: string, input: { homeScore?: string; awayScore?: string; winnerTeamId?: string }): Promise<void> {
  await authedRequest(`/sports/fixtures/${id}/results`, { method: 'POST', body: input });
}

// ---------- Achievements ----------

export interface SportsAchievement {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  teamId: string | null;
  teamName: string | null;
  tournamentId: string | null;
  tournamentName: string | null;
  placement: string;
  awardedOn: string;
  title: string | null;
  level: string | null;
}
export async function listAchievements(): Promise<SportsAchievement[]> {
  const res = await authedRequest<ApiEnvelope<SportsAchievement[]>>('/sports/achievements');
  return res.data;
}
export async function createAchievement(input: { studentId: string; teamId: string; placement: string; level?: string; awardedOn: string; title?: string }): Promise<SportsAchievement> {
  const res = await authedRequest<ApiEnvelope<SportsAchievement>>('/sports/achievements', { method: 'POST', body: input });
  return res.data;
}

// ---------- Coaches ----------

export interface Coach {
  id: string;
  personId: string | null;
  fullName: string;
  isExternal: boolean;
  contactPhone: string | null;
  qualification: string | null;
  status: string;
}
export async function listCoaches(): Promise<Coach[]> {
  const res = await authedRequest<ApiEnvelope<Coach[]>>('/coaches');
  return res.data;
}
export async function createCoach(input: {
  personId?: string;
  fullName: string;
  isExternal: boolean;
  contactPhone?: string;
  qualification?: string;
}): Promise<Coach> {
  const res = await authedRequest<ApiEnvelope<Coach>>('/coaches', { method: 'POST', body: input });
  return res.data;
}
export async function updateCoach(
  id: string,
  input: { fullName?: string; contactPhone?: string; qualification?: string; status?: 'ACTIVE' | 'INACTIVE' },
): Promise<Coach> {
  const res = await authedRequest<ApiEnvelope<Coach>>(`/coaches/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

// ---------- Equipment catalog ----------

export interface EquipmentItem {
  id: string;
  name: string;
  sportId: string | null;
  quantityTotal: number;
  quantityAvailable: number;
  condition: string | null;
}
export async function listEquipmentCatalog(): Promise<EquipmentItem[]> {
  const res = await authedRequest<ApiEnvelope<EquipmentItem[]>>('/equipment');
  return res.data;
}
export async function createEquipmentItem(input: { name: string; sportId?: string; quantityTotal: number; condition?: string }): Promise<EquipmentItem> {
  const res = await authedRequest<ApiEnvelope<EquipmentItem>>('/equipment', { method: 'POST', body: input });
  return res.data;
}

// ---------- Students (school-wide roster) ----------

export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  status: string;
}
export async function listStudents(filter: { search?: string } = {}): Promise<{ data: StudentSummary[]; meta: { total: number } }> {
  const qs = filter.search ? `?search=${encodeURIComponent(filter.search)}` : '';
  return authedRequest<{ data: StudentSummary[]; meta: { total: number } }>(`/students${qs}`);
}
export async function getStudent(id: string): Promise<StudentSummary> {
  const res = await authedRequest<ApiEnvelope<StudentSummary>>(`/students/${id}`);
  return res.data;
}

export interface SportsProfile {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  sportId: string;
  positionOrRole: string | null;
  status: string;
}
export async function listSportsProfiles(sportId: string): Promise<SportsProfile[]> {
  const res = await authedRequest<ApiEnvelope<SportsProfile[]>>(`/sports/${sportId}/profiles`);
  return res.data;
}
export async function createSportsProfile(
  sportId: string,
  input: { studentId: string; sportCategoryId?: string; joinedOn?: string; positionOrRole?: string },
): Promise<SportsProfile> {
  const res = await authedRequest<ApiEnvelope<SportsProfile>>(`/sports/${sportId}/profiles`, { method: 'POST', body: input });
  return res.data;
}
export async function updateSportsProfile(
  sportId: string,
  profileId: string,
  input: { sportCategoryId?: string; positionOrRole?: string; status?: string },
): Promise<SportsProfile> {
  const res = await authedRequest<ApiEnvelope<SportsProfile>>(`/sports/${sportId}/profiles/${profileId}`, { method: 'PATCH', body: input });
  return res.data;
}

// ---------- Academic year / calendar ----------

export interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}
export async function listAcademicYears(): Promise<AcademicYear[]> {
  const res = await authedRequest<ApiEnvelope<AcademicYear[]>>('/academic-years');
  return res.data;
}

export type CalendarEventType = 'HOLIDAY' | 'TERM_START' | 'TERM_END' | 'EXAM_WINDOW' | 'PTM' | 'FUNCTION' | 'COMPETITION' | 'WORKING_SATURDAY' | 'OTHER';
export interface CalendarEvent {
  id: string;
  academicYearId: string;
  title: string;
  description: string | null;
  eventType: CalendarEventType;
  startDate: string;
  endDate: string;
  createdBy: string | null;
}
export async function listCalendarEvents(params: { fromDate?: string; toDate?: string } = {}): Promise<CalendarEvent[]> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]);
  const res = await authedRequest<ApiEnvelope<CalendarEvent[]>>(`/calendar-events?${qs.toString()}`);
  return res.data;
}
export async function createCalendarEvent(input: { academicYearId: string; title: string; description?: string; startDate: string; endDate: string; eventType: CalendarEventType }): Promise<CalendarEvent> {
  const res = await authedRequest<ApiEnvelope<CalendarEvent>>('/calendar-events', { method: 'POST', body: { ...input, scopeType: 'SCHOOL' } });
  return res.data;
}
// Backend only allows editing/deleting an event this same account created
// (assertCanModify in calendar-events.service.ts) -- same real ownership
// rule the website's own Sports Admin calendar page already enforces.
export async function updateCalendarEvent(id: string, input: { title?: string; description?: string; startDate?: string; endDate?: string; eventType?: CalendarEventType }): Promise<CalendarEvent> {
  const res = await authedRequest<ApiEnvelope<CalendarEvent>>(`/calendar-events/${id}`, { method: 'PATCH', body: input });
  return res.data;
}
export async function deleteCalendarEvent(id: string): Promise<void> {
  await authedRequest(`/calendar-events/${id}`, { method: 'DELETE' });
}

// ---------- OD (on-duty) requests ----------

export interface SportOdRequest {
  id: string;
  teamId: string;
  teamName: string;
  sportId: string;
  sportName: string;
  eventDate: string;
  reason: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}
export async function listOdRequests(): Promise<SportOdRequest[]> {
  const res = await authedRequest<ApiEnvelope<SportOdRequest[]>>('/sports/od-requests');
  return res.data;
}
export async function createOdRequest(input: { teamId: string; fixtureId?: string; eventDate: string; reason: string }): Promise<SportOdRequest> {
  const res = await authedRequest<ApiEnvelope<SportOdRequest>>('/sports/od-requests', { method: 'POST', body: input });
  return res.data;
}

// ---------- Equipment indents ----------

export interface SportsEquipmentIndent {
  id: string;
  referenceNo: string;
  itemName: string;
  description: string | null;
  quantity: number | null;
  neededBy: string | null;
  estimatedAmountPaise: string | number | null;
  state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}
export async function listEquipmentIndents(): Promise<SportsEquipmentIndent[]> {
  const res = await authedRequest<ApiEnvelope<SportsEquipmentIndent[]>>('/sports/equipment-indents?pageSize=200');
  return res.data;
}

// ---------- Trials & selection (real -- see school-eos-backend migration
// 0022_sports_trials.sql; same real endpoints the website Sports Admin
// console now uses) ----------

export const TRIAL_ROUNDS = ['ROUND_1', 'ROUND_2', 'FINAL_ROUND'] as const;
export type TrialRound = (typeof TRIAL_ROUNDS)[number];
export const TRIAL_STATUSES = ['PENDING', 'HOLD', 'SELECTED', 'NOT_SELECTED'] as const;
export type TrialStatus = (typeof TRIAL_STATUSES)[number];

export interface SportsTrial {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  gradeName: string | null;
  sectionName: string | null;
  sportId: string;
  sportName: string;
  round: TrialRound;
  trialDate: string;
  score: string | null;
  status: TrialStatus;
  notes: string | null;
  createdAt: string;
}
export async function listTrials(): Promise<SportsTrial[]> {
  const res = await authedRequest<ApiEnvelope<SportsTrial[]>>('/sports/trials');
  return res.data;
}
export async function createTrial(input: { studentId: string; sportId: string; round: TrialRound; trialDate: string; score?: string; notes?: string }): Promise<SportsTrial> {
  const res = await authedRequest<ApiEnvelope<SportsTrial>>('/sports/trials', { method: 'POST', body: input });
  return res.data;
}
export async function updateTrial(id: string, input: { status?: TrialStatus; score?: string; notes?: string }): Promise<SportsTrial> {
  const res = await authedRequest<ApiEnvelope<SportsTrial>>(`/sports/trials/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

// ---------- Injuries & incidents (real -- see school-eos-backend migration
// 0023_sports_injuries.sql) ----------

export const INJURY_STATUSES = ['UNDER_CARE', 'OBSERVATION', 'CLOSED'] as const;
export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export interface SportsInjury {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  gradeName: string | null;
  sectionName: string | null;
  sportId: string | null;
  sportName: string | null;
  title: string;
  description: string | null;
  incidentDate: string;
  guardianInformed: boolean;
  guardianInformedAt: string | null;
  status: InjuryStatus;
  createdAt: string;
}
export async function listInjuries(): Promise<SportsInjury[]> {
  const res = await authedRequest<ApiEnvelope<SportsInjury[]>>('/sports/injuries');
  return res.data;
}
export async function createInjury(input: { studentId: string; sportId?: string; title: string; description?: string; incidentDate: string; guardianInformed: boolean }): Promise<SportsInjury> {
  const res = await authedRequest<ApiEnvelope<SportsInjury>>('/sports/injuries', { method: 'POST', body: input });
  return res.data;
}
export async function updateInjury(id: string, input: { status?: InjuryStatus; guardianInformed?: boolean }): Promise<SportsInjury> {
  const res = await authedRequest<ApiEnvelope<SportsInjury>>(`/sports/injuries/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

// ---------- Budget & approvals (real -- reuses purchase_request, see
// school-eos-backend migration 0024_sports_budget_approval_policy.sql; same
// real endpoints the website Sports Admin console now uses) ----------

export interface SportsBudgetRequest {
  id: string;
  referenceNo: string;
  itemName: string;
  description: string | null;
  estimatedAmountPaise: string | null;
  requestedByName: string | null;
  state: string;
  createdAt: string;
}
export async function listBudgetRequests(): Promise<SportsBudgetRequest[]> {
  const res = await authedRequest<ApiEnvelope<SportsBudgetRequest[]>>('/sports/budget-requests');
  return res.data;
}
export async function createBudgetRequest(input: { title: string; description?: string; estimatedAmountPaise: string }): Promise<SportsBudgetRequest> {
  const res = await authedRequest<ApiEnvelope<SportsBudgetRequest>>('/sports/budget-requests', { method: 'POST', body: input });
  return res.data;
}

// ---------- PT / sports periods (real -- reuses the real academic
// timetable for the "Physical Training" subject, no new schema; same real
// endpoint the website Sports Admin console now uses) ----------

export interface PtPeriodSlot {
  id: string;
  dayOfWeek: number;
  room: string | null;
  periodNo: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  sectionId: string;
  sectionName: string;
  gradeName: string;
  teacherFirstName: string;
  teacherLastName: string | null;
}
export async function listPtPeriods(): Promise<PtPeriodSlot[]> {
  const res = await authedRequest<ApiEnvelope<PtPeriodSlot[]>>('/sports/pt-periods');
  return res.data;
}

// ---------- Practice plans (real backend -- migration 0026) ----------

export type PracticePlanStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export const WEEKDAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export interface PracticePlan {
  id: string;
  teamId: string;
  teamName: string;
  sportName: string;
  title: string;
  startDate: string;
  endDate: string;
  weeklyFocus: Partial<Record<Weekday, string>>;
  status: PracticePlanStatus;
  createdAt: string;
}
export async function listPracticePlans(): Promise<PracticePlan[]> {
  const res = await authedRequest<ApiEnvelope<PracticePlan[]>>('/sports/practice-plans');
  return res.data;
}
export async function createPracticePlan(input: {
  teamId: string;
  title: string;
  startDate: string;
  endDate: string;
  weeklyFocus?: Partial<Record<Weekday, string>>;
}): Promise<PracticePlan> {
  const res = await authedRequest<ApiEnvelope<PracticePlan>>('/sports/practice-plans', { method: 'POST', body: input });
  return res.data;
}
export async function updatePracticePlan(id: string, input: { status?: PracticePlanStatus }): Promise<PracticePlan> {
  const res = await authedRequest<ApiEnvelope<PracticePlan>>(`/sports/practice-plans/${id}`, { method: 'PATCH', body: input });
  return res.data;
}
export async function deletePracticePlan(id: string): Promise<void> {
  await authedRequest(`/sports/practice-plans/${id}`, { method: 'DELETE' });
}

// ---------- Result entries + verification (real backend -- migration 0026) ----------

export type ResultEntryStatus = 'DRAFT' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export interface ResultEntry {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  sportId: string;
  sportName: string;
  tournamentId: string | null;
  tournamentName: string | null;
  eventName: string;
  resultValue: string;
  position: string | null;
  status: ResultEntryStatus;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string;
}
export async function listResultEntries(status?: ResultEntryStatus): Promise<ResultEntry[]> {
  const qs = status ? `?status=${status}` : '';
  const res = await authedRequest<ApiEnvelope<ResultEntry[]>>(`/sports/result-entries${qs}`);
  return res.data;
}
export async function createResultEntry(input: {
  studentId: string;
  sportId: string;
  tournamentId?: string;
  eventName: string;
  resultValue: string;
  position?: string;
}): Promise<ResultEntry> {
  const res = await authedRequest<ApiEnvelope<ResultEntry>>('/sports/result-entries', { method: 'POST', body: input });
  return res.data;
}
export async function updateResultEntry(id: string, input: { status?: ResultEntryStatus }): Promise<ResultEntry> {
  const res = await authedRequest<ApiEnvelope<ResultEntry>>(`/sports/result-entries/${id}`, { method: 'PATCH', body: input });
  return res.data;
}
export async function deleteResultEntry(id: string): Promise<void> {
  await authedRequest(`/sports/result-entries/${id}`, { method: 'DELETE' });
}

// ---------- Selection windows (real backend -- migration 0026) ----------

export type SelectionWindowStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export interface SelectionWindow {
  id: string;
  sportId: string;
  sportName: string;
  title: string;
  opensOn: string;
  closesOn: string;
  notes: string | null;
  status: SelectionWindowStatus;
  createdAt: string;
}
export async function listSelectionWindows(): Promise<SelectionWindow[]> {
  const res = await authedRequest<ApiEnvelope<SelectionWindow[]>>('/sports/selection-windows');
  return res.data;
}
export async function createSelectionWindow(input: { sportId: string; title: string; opensOn: string; closesOn: string; notes?: string }): Promise<SelectionWindow> {
  const res = await authedRequest<ApiEnvelope<SelectionWindow>>('/sports/selection-windows', { method: 'POST', body: input });
  return res.data;
}
export async function updateSelectionWindow(id: string, input: { status?: SelectionWindowStatus }): Promise<SelectionWindow> {
  const res = await authedRequest<ApiEnvelope<SelectionWindow>>(`/sports/selection-windows/${id}`, { method: 'PATCH', body: input });
  return res.data;
}
export async function deleteSelectionWindow(id: string): Promise<void> {
  await authedRequest(`/sports/selection-windows/${id}`, { method: 'DELETE' });
}

// ---------- Substitute coaches (real backend -- migration 0026) ----------

export type SubstituteCoachStatus = 'PENDING' | 'APPROVED' | 'CLOSED';
export interface SubstituteCoach {
  id: string;
  teamId: string;
  teamName: string;
  originalCoachId: string | null;
  originalCoachName: string | null;
  substituteCoachId: string;
  substituteCoachName: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: SubstituteCoachStatus;
  createdAt: string;
}
export async function listSubstituteCoaches(): Promise<SubstituteCoach[]> {
  const res = await authedRequest<ApiEnvelope<SubstituteCoach[]>>('/sports/substitute-coaches');
  return res.data;
}
export async function createSubstituteCoach(input: {
  teamId: string;
  originalCoachId?: string;
  substituteCoachId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<SubstituteCoach> {
  const res = await authedRequest<ApiEnvelope<SubstituteCoach>>('/sports/substitute-coaches', { method: 'POST', body: input });
  return res.data;
}
export async function updateSubstituteCoach(id: string, input: { status?: SubstituteCoachStatus }): Promise<SubstituteCoach> {
  const res = await authedRequest<ApiEnvelope<SubstituteCoach>>(`/sports/substitute-coaches/${id}`, { method: 'PATCH', body: input });
  return res.data;
}
export async function deleteSubstituteCoach(id: string): Promise<void> {
  await authedRequest(`/sports/substitute-coaches/${id}`, { method: 'DELETE' });
}
