// Vice Principal Inventory module (Phase 15) -- every call here hits a REAL,
// pre-existing backend endpoint (inventory-items/inventory-categories
// controllers), each newly (and minimally) broadened to also allow
// VICE_PRINCIPAL -- see each controller's own comment. No new backend
// service, no duplicated model.
//
// Deliberately excludes acquisitionCostPaise and vendor from every screen --
// procurement/financial data, out of this phase's scope, same pattern as
// every prior phase's own field-level exclusions.
//
// Inventory -> Maintenance relationship: repair-requests.controller.ts
// (the Maintenance module) already has its own PRINCIPAL precedent, but this
// phase's own instructions explicitly list "Maintenance" under "NO SCOPE
// CREEP" ("Do NOT implement: ... Maintenance"), so it was deliberately NOT
// touched or queried here. A damaged item's own real `status` field (which
// this module already shows) is the extent of what's surfaced -- no
// cross-reference into repair-request records.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}
interface PagedEnvelope<T> {
  data: T;
  meta: { page: number; limit: number; total: number };
}

export interface InventoryOverview {
  total: number;
  available: number;
  assigned: number;
  damaged: number;
  lost: number;
  retired: number;
  lowStock: number;
}

export async function getInventoryOverview(): Promise<InventoryOverview> {
  const res = await authedRequest<ApiEnvelope<InventoryOverview>>('/inventory-items/overview');
  return res.data;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  assetCode: string | null;
  quantity: number;
  lowStockThreshold: number | null;
  location: string | null;
  status: string;
  assignedToName: string | null;
  assignedOn: string | null;
}

export interface InventoryItemListParams {
  search?: string;
  categoryId?: string;
  status?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export async function listInventoryItems(
  params: InventoryItemListParams,
): Promise<{ data: InventoryItemRow[]; meta: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.status) query.set('status', params.status);
  if (params.location) query.set('location', params.location);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 30));
  return authedRequest<PagedEnvelope<InventoryItemRow[]>>(`/inventory-items?${query.toString()}`);
}

export interface InventoryItemDetail extends InventoryItemRow {
  description: string | null;
  acquisitionDate: string | null;
}

export async function getInventoryItem(id: string): Promise<InventoryItemDetail> {
  const res = await authedRequest<ApiEnvelope<InventoryItemDetail>>(`/inventory-items/${id}`);
  return res.data;
}

export interface InventoryCategory {
  id: string;
  name: string;
  status: string;
}

export async function listInventoryCategories(): Promise<InventoryCategory[]> {
  const res = await authedRequest<ApiEnvelope<InventoryCategory[]>>('/inventory-categories');
  return res.data;
}
