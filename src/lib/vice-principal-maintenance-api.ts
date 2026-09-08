// Vice Principal Repair & Maintenance module (Phase 17) -- every call here
// hits the REAL, pre-existing repair-requests.controller.ts, newly (and
// minimally) broadened to also allow VICE_PRINCIPAL alongside its existing
// PRINCIPAL grant -- see that controller's own comment. No new backend
// service, no duplicated model.
//
// Read-only: list/overview/get only. create/update/assign/start/complete/
// cancel all stay ADMIN-only server-side and are never called from this
// module -- no write actions are exposed in the VP UI.
//
// General school assets/equipment/facilities only -- vehicle repair/
// maintenance lives under Transport -> Vehicles (vehicle_maintenance),
// never duplicated here.
//
// costPaise is deliberately never rendered (financial data, out of scope,
// same pattern as every prior phase's own field-level exclusions).
//
// Inventory -> Maintenance relationship: a repair request that references an
// inventory item exposes that item's real name/asset code/id (already
// returned by the backend) so the detail screen can link straight into the
// existing Vice Principal Inventory item-detail screen (Phase 15) -- this
// only surfaces the real, existing link, it never rebuilds or duplicates
// Inventory's own logic.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface RepairRequestOverview {
  total: number;
  requested: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export async function getRepairRequestOverview(): Promise<RepairRequestOverview> {
  const res = await authedRequest<ApiEnvelope<RepairRequestOverview>>('/repair-requests/overview');
  return res.data;
}

export interface RepairRequestRow {
  id: string;
  title: string;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  inventoryItemAssetCode: string | null;
  issueType: string;
  location: string | null;
  priority: string;
  description: string;
  status: string;
  requestedOn: string;
  requestedBy: string | null;
  requestedByName: string | null;
  assignedToPersonId: string | null;
  assignedToName: string | null;
  assignedOn: string | null;
  completedOn: string | null;
  repairAction: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairRequestListParams {
  search?: string;
  status?: string;
  priority?: string;
  issueType?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export async function listRepairRequests(
  params: RepairRequestListParams,
): Promise<{ data: RepairRequestRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.issueType) query.set('issueType', params.issueType);
  if (params.location) query.set('location', params.location);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<RepairRequestRow[]>>(`/repair-requests?${query.toString()}`);
}

export async function getRepairRequest(id: string): Promise<RepairRequestRow> {
  const res = await authedRequest<ApiEnvelope<RepairRequestRow>>(`/repair-requests/${id}`);
  return res.data;
}
