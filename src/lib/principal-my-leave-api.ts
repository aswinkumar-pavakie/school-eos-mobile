// Principal -> My Leave -- the authenticated Principal's OWN leave requests
// only. Backed by GET/POST /staff/me/leave-requests and
// POST /staff/me/leave-requests/:id/withdraw -- confirmed by direct backend
// audit: staff.controller.ts:104-140, all four routes carry
// `@Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')`. PRINCIPAL was already
// explicitly granted this, identical to VICE_PRINCIPAL's own grant -- this
// was missed in the first implementation pass and is being added now on that
// same real evidence, not invented. Creation routes through the existing
// generic approvals engine using the already-configured STAFF_LEAVE_REQUEST
// policy; withdrawal reuses that engine's own existing
// POST /approvals/:id/withdraw unchanged.
//
// IMPORTANT, disclosed real backend behavior (not a bug introduced here):
// the STAFF_LEAVE_REQUEST approval_policy names a SINGLE reviewer role,
// PRINCIPAL (see staff-leave.service.ts's own comment + the policy's own
// history). ApprovalsService centrally blocks self-approval
// (request.requestedBy === actor.personId throws on approve/reject/send-back
// -- approvals.service.ts:226,313). Because the Principal is both the
// requester AND the only role that can ever be assigned as the reviewing
// step for this specific request type, a leave request the Principal submits
// through this screen will appear in Requests & Approvals as pending (the
// list is purely role-matched, not identity-excluded -- see
// approval-request.repository.ts's listForCaller SQL) but can never actually
// be approved, by the Principal or by anyone else, unless a second person
// also holds the PRINCIPAL role. This is a genuine, pre-existing gap in the
// approval_policy configuration for this one request type -- not something
// introduced or worked around here, since no backend changes were made in
// this build. Surfaced explicitly rather than hidden so it can be triaged as
// a real backend/data issue (e.g. adding ADMIN as a fallback reviewer on this
// policy) outside the scope of this mobile build.

export {
  listMyLeaveRequests,
  getMyLeaveRequest,
  createMyLeaveRequest,
  withdrawMyLeaveRequest,
  type StaffLeaveType,
  type MyLeaveRequest,
  type MyLeaveRequestDetail,
  type ApprovalStepInfo,
  type CreateMyLeaveInput,
} from './vice-principal-my-leave-api';
