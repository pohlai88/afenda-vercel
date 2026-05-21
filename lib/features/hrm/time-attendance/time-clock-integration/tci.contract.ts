import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

/** Canonical audit strings for Time Clock Integration — import `HRM_TCI_AUDIT` only. */
export const HRM_TCI_AUDIT = {
  deviceCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_device",
    verb: "create",
  }),
  deviceUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_device",
    verb: "update",
  }),
  deviceRevoke: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock.device",
    verb: "revoke",
  }),
  mappingCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_mapping",
    verb: "create",
  }),
  mappingUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_mapping",
    verb: "update",
  }),
  punchCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_punch",
    verb: "create",
  }),
  punchSearch: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_punch",
    verb: "search",
  }),
  syncRun: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_sync",
    verb: "create",
  }),
  syncFail: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock.sync",
    verb: "fail",
  }),
  exceptionSubmit: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock.exception",
    verb: "submit",
  }),
  exceptionApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock.exception",
    verb: "approve",
  }),
  exceptionReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock.exception",
    verb: "reject",
  }),
  reportExport: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "time_clock_report",
    verb: "audit",
  }),
} as const

export type HrmTciAuditAction =
  (typeof HRM_TCI_AUDIT)[keyof typeof HRM_TCI_AUDIT]
