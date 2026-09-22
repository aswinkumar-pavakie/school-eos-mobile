// Hostel Warden Profile module -- re-exports the already-real, self-scoped
// GET /staff/me and GET /school (both broadened to HOSTEL_WARDEN alongside
// every other role that already had its own Profile screen -- see
// staff.controller.ts / school.controller.ts). Same read-only convention as
// principal-profile-api.ts/sports-profile-api.ts -- no self-service edit
// path exists in the real backend for any role.

export {
  getMyStaffProfile,
  getSchoolInfo,
  type StaffProfile,
  type SchoolInfo,
} from './vice-principal-profile-api';
