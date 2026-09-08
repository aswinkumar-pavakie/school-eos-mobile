// Vice Principal Requests & Approvals module (Phase 23) -- the SAME generic
// approvals engine (school-eos-backend's approvals.controller /
// ApprovalsService) already used by Faculty's own approval-routed features
// and already referenced by the VP dashboard (Phase 3) -- no duplicate
// service, no duplicate approval engine, no new endpoint.
//
// This controller carries NO @Roles() decorator at all -- authorization is
// enforced entirely server-side, dynamically, per request: listForCaller()
// only returns requests whose CURRENT step's approver_role_code the caller
// actually holds (cross-checked live against role_assignment, not just the
// JWT's role claim); getById() enforces the same via assertCallerMayView();
// approve/reject/send-back re-verify the identical role-and-scope check
// before allowing any decision, and block self-approval centrally. VP's JWT
// already carries VICE_PRINCIPAL, so this endpoint is already reachable --
// no backend change was needed or made this phase.
//
// As of this phase, NO approval_policy row names VICE_PRINCIPAL as an
// approver_role_code anywhere in the real, live-inspected database (every
// seeded policy step names PRINCIPAL, FINANCE, ADMIN, HOSTEL_WARDEN, or
// CLASS_ADVISOR). This means the list below is REAL and CORRECT but will
// legitimately be empty right now -- not a bug, not a loading issue. The
// integration is genuine and will start surfacing real requests the moment
// (if ever) a future approval_policy row names VICE_PRINCIPAL, with zero
// further code change required here.
//
// The separate /approval-requests module (Admin's own small, fixed set of
// administrative request types -- ADMIN_ACCESS_REQUEST, ATTENDANCE_
// CORRECTION_REQUEST, etc.) is untouched and remains @Roles('ADMIN') only;
// its own code comment states academic/leadership request types are
// deliberately NOT represented there, so it was never a candidate for VP
// access in the first place.

export {
  listApprovals,
  getApprovalRequest,
  type ApprovalListParams,
  type ApprovalRequestRow,
  type ApprovalRequestDetail,
  type ApprovalStepRow,
} from './vice-principal-dashboard-api';

export { approveRequest, rejectRequest, sendBackRequest } from './faculty-approvals-api';
