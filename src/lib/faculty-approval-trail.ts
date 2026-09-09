// Shared "who approved/rejected this, and at which step" shape -- every
// Faculty request that goes through the generic approvals engine (HR
// Payroll, Payslip, Appraisal, Employee Leave & OD) attaches this the same
// way (see school-eos-backend's approval-trail.util.ts).

export interface ApprovalStepSummary {
  sequenceNo: number;
  approverRoleCode: string;
  decision: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  comment: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: 'Principal',
  FINANCE: 'Finance',
  ADMIN: 'Admin',
};

export function roleLabel(roleCode: string): string {
  return ROLE_LABELS[roleCode] ?? roleCode;
}
