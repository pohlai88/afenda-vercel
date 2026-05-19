import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

/** Canonical audit action strings for Absence Analytics & Trends. */
export const HRM_AAT_AUDIT = {
  snapshotGenerate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "absence_analytics_snapshot",
    verb: "create",
  }),
  thresholdUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "absence_analytics_threshold",
    verb: "update",
  }),
  reportExport: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "absence_analytics.report",
    verb: "audit",
  }),
  riskReview: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "absence_analytics.risk",
    verb: "audit",
  }),
} as const

export type HrmAatAuditAction =
  (typeof HRM_AAT_AUDIT)[keyof typeof HRM_AAT_AUDIT]
