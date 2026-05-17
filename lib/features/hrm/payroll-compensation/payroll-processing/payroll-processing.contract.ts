import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Payroll Processing (HRM-PAY-030).
 */
export const HRM_PAYROLL_PROCESSING_AUDIT = {
  period: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "create",
    }),
    prepare: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "update",
    }),
    amend: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "update",
    }),
    lock: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "update",
    }),
    finalize: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "update",
    }),
    close: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "audit",
    }),
    post: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_period",
      verb: "update",
    }),
  },
  profile: {
    upsert: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_profile",
      verb: "update",
    }),
  },
  payslip: {
    generate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payslip",
      verb: "create",
    }),
  },
  adjustment: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_adjustment",
      verb: "create",
    }),
    apply: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_adjustment",
      verb: "update",
    }),
  },
  anomaly: {
    detect: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_anomaly",
      verb: "audit",
    }),
  },
  paymentBatch: {
    generate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_payment_batch",
      verb: "create",
    }),
    statusUpdate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_payment",
      verb: "update",
    }),
  },
  correction: {
    request: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_correction",
      verb: "create",
    }),
    approve: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_correction",
      verb: "update",
    }),
  },
  payGroup: {
    upsert: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "payroll_group",
      verb: "update",
    }),
  },
} as const
