// Principal Transport module -- every read endpoint here (vehicles, routes,
// stops, assigned students, drivers, vehicle-route assignments) already
// grants PRINCIPAL the identical method-level access as VICE_PRINCIPAL
// (confirmed by direct backend audit across vehicles/routes/drivers/
// vehicle-route-assignments.controller.ts -- Principal's web app calls these
// exact same endpoints, view-only, no create/edit anywhere). Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  listVehicles,
  getVehicle,
  listRoutes,
  getRoute,
  listRouteStops,
  listRouteAssignedStudents,
  listDrivers,
  getDriver,
  listAssignments,
  getVehicleSpec,
  getGpsStatus,
  listVehicleDocuments,
  listDriverDocuments,
  listMaintenance,
  listFuelLog,
  computeMileage,
  getAttendant,
  type VehicleRow,
  type RouteRow,
  type RouteStopRow,
  type RouteAssignedStudentRow,
  type DriverRow,
  type VehicleRouteAssignmentRow,
  type VehicleSpec,
  type GpsStatus,
  type VehicleDocRow,
  type DriverDocRow,
  type MaintenanceRow,
  type FuelLogEntry,
  type AttendantRow,
} from './vice-principal-transport-api';
