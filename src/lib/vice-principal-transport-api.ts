// Vice Principal Transport module (Phase 13) -- every call here hits a REAL,
// pre-existing backend endpoint (vehicles/routes/drivers/vehicle-route-
// assignments controllers), each newly (and minimally) broadened to also
// allow VICE_PRINCIPAL -- see each controller's own comment. No new backend
// service, no duplicated model.
//
// Deliberately excludes: vehicle documents/maintenance (Repair & Maintenance
// -- a separate module this phase's own instructions explicitly exclude, and
// VICE_PRINCIPAL was never granted those two sub-resources on the backend
// either -- see vehicles.controller.ts's own comment), attendants and GPS
// devices/mappings (no Principal precedent, not explicitly requested by this
// phase, so left untouched per this session's own established discipline of
// only granting what's either already precedented or explicitly asked for),
// and student-transport-allocations as its own controller (no Principal
// precedent there either -- instead this module reuses routes.controller.ts's
// own already-Principal-authorized GET /routes/:id/assigned-students, which
// internally queries the exact same student_transport_allocation table).
//
// NFC boundary (this phase's own explicit instruction): there is no boarding-
// event / NFC-tap API anywhere in this backend at all (confirmed by
// inspection before writing any code -- only src/modules/devices/id-cards.ts
// exists, which is ADMIN-only physical card issuance/blocking, not a
// boarding-event log). Student transport ASSIGNMENT (which route/stop a
// student is allocated to) is real and shown below; live NFC boarding EVENTS
// do not exist in this backend, so none are displayed, invented, or
// stubbed -- matching "if hardware integration is still prototype-stage, do
// not block this module, do not invent production hardware behavior".
//
// feeSlab on the assigned-students row is deliberately never rendered by
// this module's screens -- financial data, out of this phase's scope, same
// reasoning as every prior phase's own field-level exclusions.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface VehicleRow {
  id: string;
  registrationNo: string;
  model: string | null;
  capacity: number;
  ownership: string | null;
  operationalStatus: string;
}

export async function listVehicles(): Promise<VehicleRow[]> {
  const res = await authedRequest<ApiEnvelope<VehicleRow[]>>('/vehicles');
  return res.data;
}

export async function getVehicle(id: string): Promise<VehicleRow> {
  const res = await authedRequest<ApiEnvelope<VehicleRow>>(`/vehicles/${id}`);
  return res.data;
}

export interface RouteRow {
  id: string;
  name: string;
  code: string | null;
  direction: string;
  distanceKm: string | null;
  status: string;
}

export async function listRoutes(): Promise<RouteRow[]> {
  const res = await authedRequest<ApiEnvelope<RouteRow[]>>('/routes');
  return res.data;
}

export async function getRoute(id: string): Promise<RouteRow> {
  const res = await authedRequest<ApiEnvelope<RouteRow>>(`/routes/${id}`);
  return res.data;
}

export interface RouteStopRow {
  id: string;
  routeId: string;
  stopName: string;
  sequenceNo: number;
  scheduledTime: string | null;
}

export async function listRouteStops(routeId: string): Promise<RouteStopRow[]> {
  const res = await authedRequest<ApiEnvelope<RouteStopRow[]>>(`/routes/${routeId}/stops`);
  return res.data;
}

export interface RouteAssignedStudentRow {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string | null;
  admissionNo: string;
  routeStopId: string;
  stopName: string;
  direction: string;
  status: string;
}

export async function listRouteAssignedStudents(routeId: string): Promise<RouteAssignedStudentRow[]> {
  const res = await authedRequest<ApiEnvelope<RouteAssignedStudentRow[]>>(`/routes/${routeId}/assigned-students`);
  return res.data;
}

export interface DriverRow {
  id: string;
  fullName: string;
  phone: string | null;
  licenceNo: string;
  licenceExpiry: string;
  verificationExpiry: string | null;
  status: string;
}

export async function listDrivers(): Promise<DriverRow[]> {
  const res = await authedRequest<ApiEnvelope<DriverRow[]>>('/drivers');
  return res.data;
}

export async function getDriver(id: string): Promise<DriverRow> {
  const res = await authedRequest<ApiEnvelope<DriverRow>>(`/drivers/${id}`);
  return res.data;
}

export interface VehicleRouteAssignmentRow {
  id: string;
  vehicleId: string;
  routeId: string;
  driverId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Real backend filters only (VehicleRouteAssignmentQueryDto): vehicleId,
 * routeId, currentOnly -- there is no driverId param, so "this driver's
 * current assignment" is found by fetching currentOnly assignments and
 * filtering client-side by driverId (see drivers/[id].tsx). */
export async function listAssignments(params: {
  vehicleId?: string;
  routeId?: string;
  currentOnly?: boolean;
}): Promise<VehicleRouteAssignmentRow[]> {
  const query = new URLSearchParams();
  if (params.vehicleId) query.set('vehicleId', params.vehicleId);
  if (params.routeId) query.set('routeId', params.routeId);
  if (params.currentOnly) query.set('currentOnly', 'true');
  const res = await authedRequest<ApiEnvelope<VehicleRouteAssignmentRow[]>>(`/vehicle-route-assignments?${query.toString()}`);
  return res.data;
}
