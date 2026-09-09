// Principal Audit Log module -- GET /audit-log carries
// @Roles('ADMIN', 'PRINCIPAL') with NO VICE_PRINCIPAL grant at all
// (audit-log.controller.ts, confirmed by direct backend audit) -- Principal
// has full, unredacted parity with Admin here; this is the single starkest
// Principal/VP gap in the whole module set (VP has zero capability on this
// module, per this session's own Phase 22 conclusion). Reuses the existing,
// unmodified audit system -- no parallel audit service, records remain
// immutable (read-only, no write endpoint on this controller at all).

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface AuditEventRow {
  id: string;
  actorPersonId: string | null;
  actorName: string | null;
  actorRoleCode: string | null;
  action: string;
  objectType: string;
  objectId: string | null;
  outcome: string;
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: string;
  beforeData: unknown;
  afterData: unknown;
}

export interface AuditLogQueryParams {
  actorPersonId?: string;
  objectType?: string;
  objectId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLog(
  params?: AuditLogQueryParams,
): Promise<{ data: AuditEventRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params?.actorPersonId) query.set('actorPersonId', params.actorPersonId);
  if (params?.objectType) query.set('objectType', params.objectType);
  if (params?.objectId) query.set('objectId', params.objectId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  query.set('page', String(params?.page ?? 1));
  query.set('limit', String(params?.limit ?? 50));
  return authedRequest<ApiEnvelope<AuditEventRow[]>>(`/audit-log?${query.toString()}`);
}
