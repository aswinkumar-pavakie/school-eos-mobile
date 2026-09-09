// Principal Repair & Maintenance module -- GET /repair-requests,
// /repair-requests/overview already grant PRINCIPAL the identical class-level
// access as VICE_PRINCIPAL (repair-requests.controller.ts, every write method
// has its own narrower @Roles('ADMIN') override). Re-exporting the
// already-correct VP module rather than duplicating it.

export {
  getRepairRequestOverview,
  listRepairRequests,
  getRepairRequest,
  type RepairRequestOverview,
  type RepairRequestRow,
  type RepairRequestListParams,
} from './vice-principal-maintenance-api';
