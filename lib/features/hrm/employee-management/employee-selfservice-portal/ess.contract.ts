import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical CRUD-SAP audit action strings for Employee Self-Service Portal.
 *
 * Covers: HRM-ESS-023 (audit trail for all self-service submissions, approvals,
 * rejections, and document access).
 *
 * Do NOT hard-code `"erp.hrm.employee.profile.update"` or similar in action files.
 * Import from this contract instead.
 */
export const HRM_ESS_AUDIT = {
  /** Personal profile updates from the employee portal. HRM-ESS-003/004. */
  profileUpdate: {
    /** Employee submitted a profile change request (pending HR approval). HRM-ESS-004. */
    request: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.profile_update_request",
      verb: "create",
    }),
    /** HR approved an employee profile change request. */
    approve: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.profile_update_request",
      verb: "update",
    }),
    /** HR rejected an employee profile change request. */
    reject: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.profile_update_request",
      verb: "deprecate",
    }),
    /** Direct profile update (permitted low-sensitivity fields: preferredName). */
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.profile",
      verb: "update",
    }),
    /** Banking/payroll profile update (step-up required). */
    updateBanking: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.profile.banking",
      verb: "update",
    }),
  },

  /** Document access and requests from the employee portal. HRM-ESS-009/010/015. */
  document: {
    /** Employee requested an HR-issued document. */
    request: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.document_request",
      verb: "create",
    }),
    /** Employee downloaded a document from the portal. */
    download: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.document",
      verb: "audit",
    }),
  },

  /** Policy acknowledgement. HRM-ESS-016. */
  acknowledgement: {
    /** Employee acknowledged a policy, HR notice, or required document. */
    submit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.acknowledgement",
      verb: "create",
    }),
  },

  /** Training self-attestation from the employee portal. */
  training: {
    /** Employee self-attested training completion. */
    selfAttest: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.training",
      verb: "create",
    }),
    /** Employee submitted feedback on a training record. */
    feedback: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.training.feedback",
      verb: "update",
    }),
  },

  /** Benefit-related actions from the portal. */
  benefit: {
    enroll: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.benefit_enrollment",
      verb: "create",
    }),
    cancel: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.benefit_enrollment",
      verb: "deprecate",
    }),
    lifeEvent: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.benefit_life_event",
      verb: "create",
    }),
  },

  /** Expense reimbursement claims from the employee portal. */
  claim: {
    submit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.expense_claim",
      verb: "create",
    }),
    cancel: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.expense_claim",
      verb: "deprecate",
    }),
    attachEvidence: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.expense_claim.evidence",
      verb: "create",
    }),
  },

  /** Advance/salary-advance actions from the portal. */
  advance: {
    submit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.salary_advance",
      verb: "create",
    }),
    cancel: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.salary_advance",
      verb: "deprecate",
    }),
  },

  /** Offboarding task completion from the portal. */
  offboarding: {
    completeTask: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "ess.offboarding_task",
      verb: "update",
    }),
  },
} as const

/**
 * IAM-scoped portal audit strings — not ERP-scoped (no CRUD-SAP object).
 *
 * These record access grants, revocations, and sensitive read events for
 * the employee self-service portal. Kept separate from HRM_ESS_AUDIT because
 * they use the `iam.portal.*` namespace, not `erp.hrm.*`.
 */
export const HRM_ESS_IAM_AUDIT = {
  /** HR granted portal access to an employee. */
  portal_access_grant: "iam.portal.access.grant",
  /** HR revoked portal access for an employee. */
  portal_access_revoke: "iam.portal.access.revoke",
  /** Employee viewed their own payslip in the portal. */
  payslip_view: "iam.portal.employee.payslip.view",
} as const
