import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Flexible Work Arrangement Tracking.
 * Import `HRM_FWA_AUDIT` — do not hard-code `erp.hrm.flexible_work.*` in actions.
 */
export const HRM_FWA_AUDIT = {
  typeCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_type",
    verb: "create",
  }),
  typeUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_type",
    verb: "update",
  }),
  typeSeed: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_type",
    verb: "create",
  }),
  requestCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_request",
    verb: "create",
  }),
  requestApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "approve",
  }),
  requestReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "reject",
  }),
  requestReturn: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "return",
  }),
  requestSuspend: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "update",
  }),
  requestTerminate: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "update",
  }),
  requestRenew: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_request",
    verb: "create",
  }),
  requestExpiryWatch: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "audit",
  }),
  complianceBreach: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "audit",
  }),
  requestException: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work.request",
    verb: "update",
  }),
  reportExport: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_report",
    verb: "audit",
  }),
  eligibilityRuleCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "flexible_work_eligibility_rule",
    verb: "create",
  }),
} as const

export const FWA_REQUEST_APPROVAL_SUBJECT_KIND =
  "flexible_work_request" as const

export type HrmFwaAuditAction =
  (typeof HRM_FWA_AUDIT)[keyof typeof HRM_FWA_AUDIT]
