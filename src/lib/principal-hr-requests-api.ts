// Principal HR Payroll requests -- faculty/hr-requests.controller.ts was
// broadened 2026-09 to @Roles('FACULTY', 'PRINCIPAL') -- a real, generic
// staff self-service capability (FacultyScopeRepository.getStaffId() looks
// up any active `staff` row, not a Faculty-specific one), confirmed by a
// real live create+withdraw round trip against the running backend.
// Re-exporting the already-correct Faculty module rather than duplicating it.

export {
  listHrRequests,
  createHrRequest,
  HR_CATEGORY_LABELS,
  type HrRequestCategory,
  type StaffHrRequest,
} from './faculty-hr-requests-api';
