import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for every employee lifecycle mutation.
 *
 * Built with `buildCrudSapAuditAction` so they follow the
 * `erp.<module>.<object>.<verb>` naming contract.
 *
 * HRM-LCY-028 — every lifecycle transition must emit one of these.
 */
export const HRM_EMPLOYEE_LIFECYCLE_AUDIT = {
  // ── Onboarding ──────────────────────────────────────────────────────────
  boarding: {
    task_start: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.boarding_task",
      verb: "update",
    }),
    task_complete: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.boarding_task",
      verb: "update",
    }),
    task_waive: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.boarding_task",
      verb: "deprecate",
    }),
  },

  onboarding: {
    /** An individual onboarding checklist step was marked complete. */
    step_complete: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.onboarding_step",
      verb: "update",
    }),
    /** The entire onboarding workflow for an employee was closed out. */
    complete: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.onboarding",
      verb: "update",
    }),
  },

  // ── Probation ────────────────────────────────────────────────────────────
  probation: {
    /** Cron/watch detected probation end is within the review window. HRM-LCY-007. */
    review_due: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.probation",
      verb: "audit",
    }),
    /** Probation outcome recorded: confirmed | extended | termination_recommended. HRM-LCY-008. */
    outcome_recorded: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.probation",
      verb: "update",
    }),
    /** Probation was explicitly extended (also fired as part of outcome_recorded). HRM-LCY-008. */
    extended: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.probation_extension",
      verb: "create",
    }),
  },

  // ── Confirmation ─────────────────────────────────────────────────────────
  confirmation: {
    /** Employment confirmed after successful probation. HRM-LCY-009/010. */
    approved: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.confirmation",
      verb: "create",
    }),
  },

  // ── Suspension ───────────────────────────────────────────────────────────
  suspension: {
    /** Employee placed on suspension. HRM-LCY-017. */
    initiated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.suspension",
      verb: "create",
    }),
    /** Suspension lifted and employee returned to active/confirmed. HRM-LCY-017. */
    lifted: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.suspension",
      verb: "deprecate",
    }),
  },

  // ── Resignation / notice period ──────────────────────────────────────────
  resignation: {
    /** Resignation recorded; notice period tracking starts. HRM-LCY-018/019. */
    initiated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.resignation",
      verb: "create",
    }),
    /** Last working date updated or confirmed. HRM-LCY-019. */
    last_working_date_set: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.resignation",
      verb: "update",
    }),
  },

  // ── Termination ──────────────────────────────────────────────────────────
  termination: {
    /** Termination initiated with reason and approval reference. HRM-LCY-021. */
    initiated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.termination",
      verb: "create",
    }),
  },

  // ── Retirement ───────────────────────────────────────────────────────────
  retirement: {
    /** Retirement lifecycle event recorded. HRM-LCY-022. */
    initiated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.retirement",
      verb: "create",
    }),
  },

  employment_status: {
    /** Ad-hoc employment status correction (generic status change form). HRM-LCY-002/010. */
    changed: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.employment_status",
      verb: "update",
    }),
  },

  transition: {
    /** Future-dated lifecycle transition was queued. HRM-LCY-024. */
    scheduled: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.transition",
      verb: "create",
    }),
    /** Pending lifecycle transition became effective and was applied. HRM-LCY-024/026. */
    applied: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.transition",
      verb: "update",
    }),
    /** Pending lifecycle transition was cancelled before its effective date. HRM-LCY-024. */
    cancelled: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.transition",
      verb: "deprecate",
    }),
  },

  // ── Employee movement ────────────────────────────────────────────────────
  movement: {
    /** Promotion, transfer, demotion, department/location/manager change. HRM-LCY-011–014. */
    recorded: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.movement",
      verb: "create",
    }),
  },

  // ── Contract ─────────────────────────────────────────────────────────────
  contract: {
    /** Cron/watch detected contract approaching expiry. HRM-LCY-016. */
    expiry_warning: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.contract",
      verb: "audit",
    }),
    /** Contract has reached expiry and lifecycle transition is initiated. HRM-LCY-020. */
    expiry_reached: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.contract",
      verb: "update",
    }),
    /** Contract renewal approved. HRM-LCY-015. */
    renewed: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "lifecycle.contract",
      verb: "update",
    }),
  },

} as const
