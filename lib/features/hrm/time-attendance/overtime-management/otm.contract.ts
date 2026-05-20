import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Overtime Management.
 * Import `HRM_OTM_AUDIT` — do not hard-code `erp.hrm.overtime.*` in actions.
 */
export const HRM_OTM_AUDIT = {
  typeCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_type",
    verb: "create",
  }),
  typeUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_type",
    verb: "update",
  }),
  policyCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_policy",
    verb: "create",
  }),
  policyUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_policy",
    verb: "update",
  }),
  eligibilityRuleCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_eligibility_rule",
    verb: "create",
  }),
  rateRuleCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_rate_rule",
    verb: "create",
  }),
  requestCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_request",
    verb: "create",
  }),
  requestApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "approve",
  }),
  requestBulkApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "audit",
  }),
  compensatoryCredit: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.compensatory_leave",
    verb: "create",
  }),
  requestReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "reject",
  }),
  requestReturn: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "return",
  }),
  requestAdjust: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "update",
  }),
  requestCancel: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "update",
  }),
  requestException: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "update",
  }),
  calculationSnapshot: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime.request",
    verb: "audit",
  }),
  payrollExport: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_payroll_export",
    verb: "audit",
  }),
  reportExport: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "overtime_report",
    verb: "audit",
  }),
} as const

export const OTM_REQUEST_APPROVAL_SUBJECT_KIND = "overtime_request" as const

export type HrmOtmAuditAction =
  (typeof HRM_OTM_AUDIT)[keyof typeof HRM_OTM_AUDIT]
