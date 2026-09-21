// Sports Admin Profile module -- re-exports the already-real, self-scoped
// GET /staff/me (broadened to SPORTS_ADMIN alongside VICE_PRINCIPAL, see
// staff.controller.ts) and GET /school (already broadened to SPORTS_ADMIN).
// Same read-only convention as principal-profile-api.ts -- no self-service
// edit path exists in the real backend for any role.

export {
  getMyStaffProfile,
  getSchoolInfo,
  type StaffProfile,
  type SchoolInfo,
} from './vice-principal-profile-api';
