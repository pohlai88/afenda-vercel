import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical CRUD-SAP audit action strings for HRM Document Management.
 *
 * Covers: HRM-DOC-023 (audit trail for upload, view, download, verify, reject,
 * replace, archive, and delete actions).
 *
 * Import from this contract instead of hard-coding strings in action files.
 */
export const HRM_DOCUMENT_AUDIT = {
  /** Document uploaded and attached to an employee. HRM-DOC-001. */
  attach: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "create",
  }),

  /**
   * HR user verified/approved a submitted document. HRM-DOC-008/009.
   * Sets verificationStatus to "verified".
   */
  verify: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "update",
  }),

  /**
   * HR user rejected a submitted document. HRM-DOC-008/010.
   * Sets verificationStatus to "rejected"; captures rejection reason.
   */
  reject: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "deprecate",
  }),

  /**
   * Document replaced by a newer version. HRM-DOC-005/014.
   * Points replacedByDocumentId → new document; old row preserved per retention.
   */
  replace: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "update",
  }),

  /**
   * Document archived (employee separated or retention period elapsed). HRM-DOC-022.
   * Sets verificationStatus to "archived".
   */
  archive: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "deprecate",
  }),

  /** Document download recorded for audit. HRM-DOC-018/023. */
  download: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "audit",
  }),

  /** Document viewed (accessed in portal or vault). HRM-DOC-023. */
  view: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document",
    verb: "search",
  }),

  /** Document expiry alert tiers — kept in document-expiry-watch.shared.ts via DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS. */
  expiryWarning30d: "erp.hrm.document.expiry_warning_30d",
  expiryWarning14d: "erp.hrm.document.expiry_warning_14d",
  expiryCritical7d: "erp.hrm.document.expiry_critical_7d",

  /** Policy acknowledgement written by employee (via ESS). HRM-DOC-015/016. */
  policyAcknowledge: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "document.policy_acknowledgement",
    verb: "create",
  }),
} as const
