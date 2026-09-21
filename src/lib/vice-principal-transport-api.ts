// Vice Principal Transport module (Phase 13) -- every call here hits a REAL,
// pre-existing backend endpoint (vehicles/routes/drivers/vehicle-route-
// assignments controllers), each newly (and minimally) broadened to also
// allow VICE_PRINCIPAL -- see each controller's own comment. No new backend
// service, no duplicated model.
//
// Vehicle documents/maintenance/fuel-log/spec/gps-status, driver documents
// and attendants WERE later added below (re-audited: vehicles.controller.ts,
// drivers.controller.ts and attendants.controller.ts all now carry
// @Roles(...,'VICE_PRINCIPAL',...) on every one of these GET routes,
// confirmed live -- the exclusion note above is now stale for those
// specific sub-resources; it still holds for GPS device/mapping WRITE
// endpoints and student-transport-allocations as its own controller, which
// remain untouched.
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
  attendantId: string | null;
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

// ---- Vehicle spec / GPS / documents / maintenance / fuel log (real -- see
// this file's own updated top comment) ---------------------------------

export interface VehicleSpec {
  vehicleId: string;
  manufacturer: string | null;
  fuelType: string | null;
  seatingLayout: string | null;
  hasCctv: boolean | null;
  hasGps: boolean | null;
  hasFireExtinguisher: boolean | null;
  hasFirstAidKit: boolean | null;
}
export async function getVehicleSpec(vehicleId: string): Promise<VehicleSpec | null> {
  try {
    const res = await authedRequest<ApiEnvelope<VehicleSpec>>(`/vehicles/${vehicleId}/spec`);
    return res.data;
  } catch {
    return null;
  }
}

export interface GpsStatus {
  deviceUid: string;
  status: string;
}
export async function getGpsStatus(vehicleId: string): Promise<GpsStatus | null> {
  try {
    const res = await authedRequest<ApiEnvelope<GpsStatus>>(`/vehicles/${vehicleId}/gps-status`);
    return res.data;
  } catch {
    return null;
  }
}

export interface VehicleDocRow {
  id: string;
  docType: string;
  docNo: string | null;
  validTo: string;
}
export async function listVehicleDocuments(vehicleId: string): Promise<VehicleDocRow[]> {
  const res = await authedRequest<ApiEnvelope<VehicleDocRow[]>>(`/vehicles/${vehicleId}/documents`);
  return res.data;
}

export interface DriverDocRow {
  id: string;
  docType: string;
  docNo: string | null;
  validTo: string;
}
export async function listDriverDocuments(driverId: string): Promise<DriverDocRow[]> {
  const res = await authedRequest<ApiEnvelope<DriverDocRow[]>>(`/drivers/${driverId}/documents`);
  return res.data;
}

export interface MaintenanceRow {
  id: string;
  performedOn: string;
  serviceType: string;
  odometerKm: number | null;
  costPaise: string | number | null;
}
export async function listMaintenance(vehicleId: string): Promise<MaintenanceRow[]> {
  const res = await authedRequest<ApiEnvelope<MaintenanceRow[]>>(`/vehicles/${vehicleId}/maintenance`);
  return res.data;
}

export interface FuelLogEntry {
  id: string;
  filledOn: string;
  litres: string | number;
  odometerKm: number | null;
}
export async function listFuelLog(vehicleId: string): Promise<FuelLogEntry[]> {
  const res = await authedRequest<ApiEnvelope<FuelLogEntry[]>>(`/vehicles/${vehicleId}/fuel-log`);
  return res.data;
}

/** Real mileage from consecutive real fuel-log odometer readings -- mirrors
 * the website's own TransportOversightRouteDetail computeMileage exactly.
 * Returns null (shown as "—") without at least one usable consecutive pair
 * with both odometer readings recorded -- never fabricated. */
export function computeMileage(entries: FuelLogEntry[]): number | null {
  const withOdo = [...entries].filter((e) => e.odometerKm != null).sort((a, b) => (a.filledOn < b.filledOn ? -1 : 1));
  if (withOdo.length < 2) return null;
  let totalKm = 0;
  let totalLitres = 0;
  for (let i = 1; i < withOdo.length; i++) {
    const cur = withOdo[i];
    const prev = withOdo[i - 1];
    if (!cur || !prev) continue;
    const km = (cur.odometerKm as number) - (prev.odometerKm as number);
    const litres = Number(cur.litres);
    if (km > 0 && litres > 0) {
      totalKm += km;
      totalLitres += litres;
    }
  }
  return totalLitres > 0 ? totalKm / totalLitres : null;
}

export interface AttendantRow {
  id: string;
  fullName: string;
  phone: string | null;
  status: string;
}
export async function getAttendant(id: string): Promise<AttendantRow> {
  const res = await authedRequest<ApiEnvelope<AttendantRow>>(`/attendants/${id}`);
  return res.data;
}
