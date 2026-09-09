// Principal Requests & Approvals module -- the SAME generic approvals engine
// (school-eos-backend's approvals.controller / ApprovalsService) VP's own
// module already uses, and the exact one Principal's real web app calls
// (principal/requests/page.tsx + [id]/page.tsx). No duplicate service, no
// duplicate approval engine.
//
// This controller carries NO @Roles() decorator -- authorization is entirely
// server-side, per request: listForCaller() returns only requests where the
// caller is the requester or holds the current step's approver_role_code
// (cross-checked live against role_assignment); getById() enforces the same
// via assertCallerMayView(); approve/reject/send-back/withdraw re-verify
// identically and block self-approval centrally. Principal's JWT already
// carries PRINCIPAL, so this endpoint is already reachable -- no backend
// change needed.
//
// UNLIKE Vice Principal (where no approval_policy row names VICE_PRINCIPAL
// as an approver anywhere, so VP's list is real but always empty): Principal
// is a genuinely ACTIVE approver today, confirmed by direct backend audit of
// real approval_policy rows -- REFUND (2-step FINANCE->PRINCIPAL),
// FEE_CONCESSION (2-step), FEE_STRUCTURE (single-step PRINCIPAL),
// EXPENSE_ABOVE_PETTY (single-step PRINCIPAL), plus community/faculty/media
// workflows. This module will show real, live requests requiring a decision.
//
// approve/reject/send-back/withdraw are re-exported from faculty-approvals-api
// (same generic engine, same functions VP's module already re-exports) --
// not duplicated.

export {
  listApprovals,
  getApprovalRequest,
  type ApprovalListParams,
  type ApprovalRequestRow,
  type ApprovalRequestDetail,
  type ApprovalStepRow,
} from './vice-principal-dashboard-api';

export { approveRequest, rejectRequest, sendBackRequest, withdrawRequest } from './faculty-approvals-api';
