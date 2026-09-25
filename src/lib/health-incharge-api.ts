// Health In-charge app -- real backend calls only (school-eos-backend's
// src/modules/health/health-incharge.controller.ts, HEALTH_INCHARGE only), every
// one going through authedRequest. Types and endpoint shapes match the website's
// own src/lib/health-incharge-api.ts + app/(dashboard)/health-incharge/actions.ts
// exactly (same backend, same DTOs -- see health-incharge.dto.ts) so the two
// clients never drift into different assumptions about the same API.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export const VISIT_ACTIONS = ['REST', 'MEDICATION', 'SENT_HOME', 'REFERRED', 'SICKBAY_ADMIT', 'NO_ACTION'] as const;
export const SERIOUS_ACTIONS: string[] = ['SENT_HOME', 'REFERRED', 'SICKBAY_ADMIT'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const ESCALATION_CHANNELS = ['PHONE', 'SMS', 'WHATSAPP', 'APP', 'IN_PERSON'] as const;

export const ACTION_LABEL: Record<string, string> = {
  REST: 'Rest',
  MEDICATION: 'Medication',
  SENT_HOME: 'Sent home',
  REFERRED: 'Referred',
  SICKBAY_ADMIT: 'Sickbay admit',
  NO_ACTION: 'No action',
};
export const ALERT_LABEL: Record<string, string> = {
  INFECTION_CLUSTER: 'Infection cluster',
  MEDICATION_MISSED: 'Medication missed',
  FOLLOWUP_OVERDUE: 'Follow-up overdue',
  VISIT_UNNOTIFIED: 'Visit not notified',
  ALLERGY_RISK: 'Allergy risk',
};
export const CHANNEL_LABEL: Record<string, string> = {
  PHONE: 'Phone',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  APP: 'App',
  IN_PERSON: 'In person',
};

export interface VisitRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  visitedAt: string;
  complaint: string;
  vitals: { temp_c?: number; pulse?: number; spo2?: number; bp?: string } | null;
  observation: string | null;
  action: string;
  attendedByFirstName: string | null;
  attendedByLastName: string | null;
  parentNotifiedAt: string | null;
  outcome: string | null;
  isHosteller: boolean;
}

export interface AlertRow {
  id: string;
  alertType: string;
  scopeType: string | null;
  studentId: string | null;
  studentFirstName: string | null;
  studentLastName: string | null;
  detectedAt: string;
  detail: Record<string, unknown> | null;
  acknowledgedByFirstName: string | null;
  acknowledgedByLastName: string | null;
  acknowledgedAt: string | null;
}

export interface EscalationRow {
  id: string;
  sourceType: string;
  sourceId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  sequenceNo: number;
  contactedName: string | null;
  contactedAt: string;
  channel: string | null;
  response: string | null;
  outcome: string | null;
}

export interface StudentLookup {
  studentId: string;
  admissionNo: string;
  firstName: string;
  lastName: string | null;
  gradeName: string | null;
  sectionName: string | null;
  bloodGroup: string | null;
  hasProfile: boolean;
}

export interface HealthProfile {
  id: string;
  studentId: string;
  bloodGroup: string | null;
  heightCm: string | null;
  weightKg: string | null;
  measuredOn: string | null;
  familyDoctor: string | null;
  doctorPhone: string | null;
  insuranceRef: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface ConsentRow {
  id: string;
  guardianFirstName: string | null;
  guardianLastName: string | null;
  scope: string;
  consentGivenAt: string;
  validUntil: string | null;
}

export interface StudentHealth {
  student: { studentId: string; firstName: string; lastName: string | null; gradeName: string | null; sectionName: string | null; admissionNo: string };
  profile: HealthProfile | null;
  consents: ConsentRow[];
  visits: VisitRow[];
  escalations: EscalationRow[];
}

export interface HealthDashboard {
  counts: {
    visitsToday: number;
    visitsThisWeek: number;
    needsParentNotice: number;
    openAlerts: number;
    escalationsThisWeek: number;
    profilesWithoutBloodGroup: number;
  };
  recentVisits: VisitRow[];
  needsNotice: VisitRow[];
  openAlerts: AlertRow[];
}

async function get<T>(path: string): Promise<T> {
  const res = await authedRequest<ApiEnvelope<T>>(`/health-incharge${path}`);
  return res.data;
}
async function send<T>(path: string, method: 'POST' | 'PUT' | 'PATCH', body?: unknown): Promise<T> {
  const res = await authedRequest<ApiEnvelope<T>>(`/health-incharge${path}`, {
    method,
    body: body ?? {},
  });
  return res.data;
}

export const getHealthDashboard = () => get<HealthDashboard>('/dashboard');
export const searchHealthStudents = (search: string) => get<StudentLookup[]>(`/students?search=${encodeURIComponent(search)}`);
export const getStudentHealth = (id: string) => get<StudentHealth>(`/students/${id}`);
export const saveHealthProfile = (studentId: string, body: Partial<Pick<HealthProfile, 'bloodGroup' | 'familyDoctor' | 'doctorPhone' | 'insuranceRef' | 'notes'>> & { heightCm?: number | null; weightKg?: number | null; measuredOn?: string | null }) =>
  send<HealthProfile>(`/students/${studentId}/profile`, 'PUT', body);

export function listHealthVisits(q: { studentId?: string; action?: string; from?: string; to?: string; needsParentNotice?: boolean } = {}) {
  const p = new URLSearchParams();
  if (q.studentId) p.set('studentId', q.studentId);
  if (q.action) p.set('action', q.action);
  if (q.from) p.set('from', q.from);
  if (q.to) p.set('to', q.to);
  if (q.needsParentNotice) p.set('needsParentNotice', 'true');
  const qs = p.toString();
  return get<VisitRow[]>(`/visits${qs ? `?${qs}` : ''}`);
}
export const createHealthVisit = (body: {
  studentId: string;
  complaint: string;
  vitals?: { temp_c?: number; pulse?: number; spo2?: number; bp?: string };
  observation?: string;
  action: (typeof VISIT_ACTIONS)[number];
  outcome?: string;
  notifyParent?: boolean;
}) => send<VisitRow>('/visits', 'POST', body);
export const updateHealthVisit = (id: string, body: { observation?: string; outcome?: string; action?: (typeof VISIT_ACTIONS)[number] }) =>
  send<VisitRow>(`/visits/${id}`, 'PATCH', body);
export const notifyVisitParent = (id: string) => send<VisitRow>(`/visits/${id}/notify-parent`, 'POST');

export const listHealthAlerts = (status?: 'open' | 'done') => get<AlertRow[]>(`/alerts${status ? `?status=${status}` : ''}`);
export const acknowledgeHealthAlert = (id: string) => send<AlertRow>(`/alerts/${id}/acknowledge`, 'POST');

export const listHealthEscalations = (studentId?: string) => get<EscalationRow[]>(`/escalations${studentId ? `?studentId=${studentId}` : ''}`);
export const createHealthEscalation = (body: { visitId: string; contactedName: string; channel: (typeof ESCALATION_CHANNELS)[number]; response?: string; outcome?: string }) =>
  send<EscalationRow>('/escalations', 'POST', body);

export const studentName = (r: { studentFirstName?: string | null; studentLastName?: string | null; firstName?: string; lastName?: string | null }) =>
  [r.studentFirstName ?? r.firstName, r.studentLastName ?? r.lastName].filter(Boolean).join(' ');
export const classLabel = (g: string | null, s: string | null) => (g ? `${g}${s ? `-${s}` : ''}` : '—');
