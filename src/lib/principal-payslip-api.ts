// Principal Payslip -- faculty/payslip.controller.ts was broadened 2026-09
// to @Roles('FACULTY', 'PRINCIPAL') -- confirmed by a real live
// request+withdraw round trip against the running backend. Re-exporting the
// already-correct Faculty module rather than duplicating it.

export {
  getPayslipRequestStatus,
  requestPayslipAccess,
  listPayslips,
  type Payslip,
  type PayslipAccessRequest,
  type PayslipRequestStatus,
} from './faculty-payslip-api';
