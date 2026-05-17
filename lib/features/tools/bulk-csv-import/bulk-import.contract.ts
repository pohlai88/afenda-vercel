import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/** Canonical audit strings for governed HRM CSV import sessions. */
export const HRM_BULK_IMPORT_AUDIT = {
  sessionCommit: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "import",
    verb: "update",
  }),
  sessionRollback: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "import",
    verb: "deprecate",
  }),
} as const
