import { buildErpAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Benefits Administration (HRM-BEN-028).
 *
 * Legacy enrollment strings are frozen for IAM ledger continuity; new surfaces
 * use `buildErpAuditAction` with explicit verb slugs.
 */
export const HRM_BENEFIT_AUDIT = {
  plan: {
    create: "erp.hrm.benefit.create",
    update: "erp.hrm.benefit.update",
    archive: "erp.hrm.benefit.archive",
  },
  enrollment: {
    enroll: "erp.hrm.benefit.enroll",
    enroll_portal: "erp.hrm.benefit.enrollment.enroll",
    activate: "erp.hrm.benefit.enrollment.activate",
    waive: "erp.hrm.benefit.enrollment.waive",
    waive_portal: "erp.hrm.benefit.enrollment.waive",
    terminate: "erp.hrm.benefit.enrollment.terminate",
    suspend: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.enrollment",
      verb: "suspend",
    }),
    expire: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.enrollment",
      verb: "expire",
    }),
  },
  life_event: {
    record: "erp.hrm.benefit.life_event.record",
    verify: "erp.hrm.benefit.life_event.verify",
  },
  open_enrollment: {
    create: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.open_enrollment",
      verb: "create",
    }),
    update: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.open_enrollment",
      verb: "update",
    }),
    close: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.open_enrollment",
      verb: "close",
    }),
  },
  eligibility: {
    override: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.eligibility_override",
      verb: "approve",
    }),
  },
  provider: {
    create: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.provider",
      verb: "create",
    }),
    update: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.provider",
      verb: "update",
    }),
  },
  claim_reference: {
    create: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.claim_reference",
      verb: "create",
    }),
    update: buildErpAuditAction({
      area: "erp",
      module: "hrm",
      object: "benefit.claim_reference",
      verb: "update",
    }),
  },
  enrollment_change: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "benefit.enrollment",
    verb: "change",
  }),
} as const
