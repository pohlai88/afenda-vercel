import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit + outbound event strings for Expense Reimbursement (HRM-EXP).
 * Import from this module — do not hard-code `erp.hrm.claim.*` in action files.
 */
export const HRM_EXPENSE_REIMBURSEMENT_AUDIT = {
  claim: {
    submit: "erp.hrm.claim.submit",
    cancel: "erp.hrm.claim.cancel",
    attachEvidence: "erp.hrm.claim.attach_evidence",
    paid: "erp.hrm.claim.paid",
    return: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "claim",
      verb: "deprecate",
    }),
    reject: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "claim",
      verb: "deprecate",
    }),
    overrideDuplicate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "claim.duplicate",
      verb: "update",
    }),
    grantException: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "claim.exception",
      verb: "resolve",
    }),
  },
  fund: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "expense_fund",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "expense_fund",
      verb: "update",
    }),
    suspend: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "expense_fund",
      verb: "deprecate",
    }),
    replenish: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "expense_fund",
      verb: "update",
    }),
  },
  approval: {
    request: "erp.hrm.approval.request",
    approve: "erp.hrm.approval.approve",
    reject: "erp.hrm.approval.reject",
    cancel: "erp.hrm.approval.cancel",
  },
} as const

/** Subscribable outbound delivery topics (must match `ORG_EVENT_TYPES`). */
export const HRM_CLAIM_EVENT_TYPES = {
  submitted: "erp.hrm.claim.submitted",
  underReview: "erp.hrm.claim.under_review",
  approved: "erp.hrm.claim.approved",
  rejected: "erp.hrm.claim.rejected",
  returned: "erp.hrm.claim.returned",
  exceptionRequested: "erp.hrm.claim.exception_requested",
  paid: "erp.hrm.claim.paid",
  overdue: "erp.hrm.claim.overdue",
} as const
