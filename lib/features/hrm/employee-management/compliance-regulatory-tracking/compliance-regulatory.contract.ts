import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Compliance & Regulatory Tracking.
 *
 * All strings are built with `buildCrudSapAuditAction` so they follow the
 * `erp.<module>.<object>.<verb>` naming convention.
 *
 * HRM-CMP-025 — every compliance status change, filing update, exception,
 * waiver, and corrective action must emit one of these actions.
 */
export const HRM_COMPLIANCE_REGULATORY_AUDIT = {
  obligation: {
    configured: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.obligation",
      verb: "create",
    }),
    archived: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.obligation",
      verb: "deprecate",
    }),
  },

  // ── Statutory evidence / pack ────────────────────────────────────────────
  pack: {
    /** Statutory pack evidence first generated for a locked payroll period. */
    generated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.pack",
      verb: "create",
    }),
    /** Compliance pack regenerated for a payroll period. */
    regenerate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.pack",
      verb: "create",
    }),
    /** Compliance pack exported by an authorized user. */
    export: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.pack",
      verb: "search",
    }),
  },

  // ── Statutory evidence submission ────────────────────────────────────────
  evidence: {
    /** Evidence record manually marked as submitted (without outbox delivery). */
    mark_submitted: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.evidence",
      verb: "update",
    }),
    /** Evidence submitted via the org_event_delivery outbox. */
    submitted: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.evidence",
      verb: "update",
    }),
    /** Bureau acknowledgement recorded (manual or webhook). */
    acknowledged: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.evidence",
      verb: "resolve",
    }),
  },

  // ── Document expiry alerts ────────────────────────────────────────────────
  document: {
    /** Document expiring within 30 days. */
    expiry_warning_30d: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.document",
      verb: "audit",
    }),
    /** Document expiring within 14 days. */
    expiry_warning_14d: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.document",
      verb: "audit",
    }),
    /** Document expiring within 7 days — critical. */
    expiry_critical_7d: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.document",
      verb: "audit",
    }),
  },

  // ── Work authorization ────────────────────────────────────────────────────
  work_authorization: {
    /** Work authorization record created or updated. */
    upsert: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.work_authorization",
      verb: "update",
    }),
    /** Work authorization flagged as expiring. */
    expiry_warning: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.work_authorization",
      verb: "audit",
    }),
  },

  // ── Compliance exception ──────────────────────────────────────────────────
  exception: {
    /** New compliance exception created for a missing/expired/overdue item. HRM-CMP-017. */
    created: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "create",
    }),
    /** Corrective action assigned to an exception. HRM-CMP-018. */
    corrective_action_assigned: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "update",
    }),
    /** Corrective action progress updated. HRM-CMP-019. */
    corrective_action_updated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "update",
    }),
    /** Corrective action completed — exception resolved. HRM-CMP-019. */
    resolved: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "resolve",
    }),
    /** Exception waived with documented reason and authorization. HRM-CMP-017. */
    waived: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "deprecate",
    }),
    /** Exception escalated because corrective action is overdue. */
    escalated: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.exception",
      verb: "audit",
    }),
  },

  // ── Mandatory filing / regulatory calendar ───────────────────────────────
  filing: {
    /** Mandatory filing requirement recorded. HRM-CMP-009. */
    requirement_created: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.filing",
      verb: "create",
    }),
    /** Filing marked as submitted. HRM-CMP-009. */
    submitted: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.filing",
      verb: "update",
    }),
    /** Filing deadline overdue — alert generated. HRM-CMP-009/016. */
    overdue: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.filing",
      verb: "audit",
    }),
    /** Filing confirmed / acknowledged by the authority. */
    confirmed: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.filing",
      verb: "resolve",
    }),
    /** Filing formally waived by an authorized reviewer. */
    waived: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.filing",
      verb: "deprecate",
    }),
  },

  // ── Policy acknowledgement compliance ────────────────────────────────────
  acknowledgement: {
    /** System flagged a missing mandatory policy acknowledgement. HRM-CMP-014. */
    missing_flagged: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.acknowledgement",
      verb: "audit",
    }),
  },

  // ── Training compliance ───────────────────────────────────────────────────
  training: {
    /** Mandatory training flagged as overdue for an employee. HRM-CMP-013. */
    overdue_flagged: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.training",
      verb: "audit",
    }),
    /** Mandatory training certification approaching expiry. HRM-CMP-007. */
    certification_expiry_warning: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.training",
      verb: "audit",
    }),
  },

  report: {
    exported: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "compliance.report",
      verb: "search",
    }),
  },
} as const
