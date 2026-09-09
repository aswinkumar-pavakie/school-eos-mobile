// Principal Profile module -- GET /staff/me already grants PRINCIPAL the
// identical self-scoped access as VICE_PRINCIPAL (staff.controller.ts:
// @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'), staffId resolved
// server-side from the caller's own personId, never a client-supplied id).
// GET /school is likewise already broadened to PRINCIPAL (confirmed by
// direct backend audit, also used by Principal's own web Settings page).
// There is no dedicated Principal web Profile page (confirmed by audit --
// the shared Shell component has no profile concept at all for any role,
// only sign-out), but both backend capabilities genuinely already exist and
// are real, so this is adaptation of an authorized capability, not
// invention. Re-exporting the already-correct VP module rather than
// duplicating it.

export {
  getMyStaffProfile,
  getSchoolInfo,
  type StaffProfile,
  type SchoolInfo,
} from './vice-principal-profile-api';
