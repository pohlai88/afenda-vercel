import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Offboarding & Exit Management.
 * HRM-OFF-028 — every offboarding action must emit one of these.
 */
export const HRM_OFFBOARDING_EXIT_AUDIT = {
  /** Offboarding process started. HRM-OFF-001/002. */
  initiated: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding",
    verb: "create",
  }),
  /** Exit approval granted. HRM-OFF-005. */
  approved: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding",
    verb: "update",
  }),
  /** Exit approval rejected. HRM-OFF-005. */
  rejected: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding",
    verb: "deprecate",
  }),
  task: {
    /** Checklist item marked complete. HRM-OFF-008. */
    complete: "erp.hrm.employee.offboarding.task.complete",
    /** Checklist item marked overdue (cron/watch). HRM-OFF-027. */
    overdue: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "offboarding.task",
      verb: "audit",
    }),
  },
  /** Exit interview scheduled. HRM-OFF-009. */
  exit_interview_scheduled: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.exit_interview",
    verb: "create",
  }),
  /** Exit interview feedback recorded. HRM-OFF-010. */
  exit_interview_completed: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.exit_interview",
    verb: "update",
  }),
  /** Asset recovery status updated. HRM-OFF-012/014. */
  asset_recovery_updated: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.asset",
    verb: "update",
  }),
  /** Access revocation confirmed. HRM-OFF-015/016. */
  access_revoked: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.access",
    verb: "update",
  }),
  /** Pre-clearance checks completed. HRM-OFF-017. */
  clearance_verified: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.clearance",
    verb: "audit",
  }),
  /** Final settlement readiness published to Payroll. HRM-OFF-018. */
  settlement_ready: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.settlement",
    verb: "update",
  }),
  /** Payroll returned settlement blockers. HRM-OFF-019. */
  settlement_blocked: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.settlement",
    verb: "audit",
  }),
  /** All checklist items complete — offboarding closed. HRM-OFF-021. */
  complete: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding",
    verb: "update",
  }),
  /** Rehire eligibility recorded. HRM-OFF-023. */
  rehire_eligibility_set: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "offboarding.rehire",
    verb: "update",
  }),
} as const
