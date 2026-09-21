// Principal self-appraisal -- faculty/appraisal.controller.ts was broadened
// 2026-09 to @Roles('FACULTY', 'PRINCIPAL') -- confirmed by a real live
// create+withdraw round trip against the running backend. The Principal is
// genuinely both requester and sole approver here (STAFF_APPRAISAL's own
// single-step policy names PRINCIPAL) -- the same disclosed self-approval
// shape already accepted for STAFF_LEAVE_REQUEST elsewhere in this app.
// Re-exporting the already-correct Faculty module rather than duplicating it.

export { listAppraisals, createAppraisal, type StaffAppraisal } from './faculty-appraisal-api';
