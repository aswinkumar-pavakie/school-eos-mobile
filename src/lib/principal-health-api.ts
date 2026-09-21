// Principal Health & Infirmary module -- full feature parity with the
// website's own /principal/health page, previously mobile-missing entirely.
// Real data throughout: health_profile, infirmary_visit, health_alert,
// medical_escalation (see backend's health.controller.ts's own comment).
// Read-only: the real data owner is the HEALTH_INCHARGE role, which has no
// mobile login built yet -- recording a new visit/alert/escalation stays
// out of scope until that role exists, same as the website's own page.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface InfirmaryVisitRow {
  id: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  gradeName: string | null;
  sectionName: string | null;
  visitedAt: string;
  complaint: string;
  observation: string | null;
  action: string;
  attendedByFirstName: string | null;
  attendedByLastName: string | null;
  outcome: string | null;
  isHosteller: boolean;
}
export async function listInfirmaryVisits(params: { action?: string } = {}): Promise<InfirmaryVisitRow[]> {
  const query = new URLSearchParams();
  if (params.action) query.set('action', params.action);
  const res = await authedRequest<ApiEnvelope<InfirmaryVisitRow[]>>(`/health/infirmary-visits?${query.toString()}`);
  return res.data;
}

export interface HealthAlertRow {
  id: string;
  alertType: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  detectedAt: string;
  acknowledgedByFirstName: string | null;
  acknowledgedByLastName: string | null;
  acknowledgedAt: string | null;
}
export async function listHealthAlerts(): Promise<HealthAlertRow[]> {
  const res = await authedRequest<ApiEnvelope<HealthAlertRow[]>>('/health/alerts');
  return res.data;
}

export interface MedicalEscalationRow {
  id: string;
  studentFirstName: string;
  studentLastName: string | null;
  sequenceNo: number;
  contactedName: string | null;
  contactedAt: string;
  channel: string | null;
  outcome: string | null;
}
export async function listMedicalEscalations(): Promise<MedicalEscalationRow[]> {
  const res = await authedRequest<ApiEnvelope<MedicalEscalationRow[]>>('/health/escalations');
  return res.data;
}
