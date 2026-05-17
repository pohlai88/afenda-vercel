import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical CRUD-SAP audit action strings for Organizational Chart & Hierarchy.
 *
 * Covers: HRM-ORG-025 (audit trail for all organization hierarchy changes).
 *
 * Usage: import { HRM_ORG_STRUCTURE_AUDIT } from "./org-structure.contract"
 * Never hard-code "erp.hrm.department.*" / "erp.hrm.position.*" strings in action files.
 */
export const HRM_ORG_STRUCTURE_AUDIT = {
  /** Organization unit (department, business unit, team, legal entity). HRM-ORG-001/002. */
  orgUnit: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.unit",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.unit",
      verb: "update",
    }),
    /** Archive an org unit — children and placements must be resolved first. */
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.unit",
      verb: "deprecate",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.unit",
      verb: "audit",
    }),
  },

  /** Position within the org structure. HRM-ORG-009/010. */
  position: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.position",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.position",
      verb: "update",
    }),
    /** Archive position — employees must be reassigned first. */
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.position",
      verb: "deprecate",
    }),
    /** Reporting line update (reports-to). HRM-ORG-005/006. */
    update_reporting_line: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.position",
      verb: "update",
    }),
    audit: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.position",
      verb: "audit",
    }),
  },

  /** Job grade ladder. */
  jobGrade: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.job_grade",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.job_grade",
      verb: "update",
    }),
    deprecate: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.job_grade",
      verb: "deprecate",
    }),
  },

  /** CSV / integration export of org structure snapshot. HRM-ORG-023. */
  export: {
    search: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.structure",
      verb: "search",
    }),
  },

  /** Employee placement assignment — org unit + position + manager effective-dated record. HRM-ORG-011. */
  placement: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.placement",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.placement",
      verb: "update",
    }),
  },

  /** Effective-dated employee reporting relationship: direct, dotted-line, or matrix. */
  reportingRelationship: {
    create: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.reporting_relationship",
      verb: "create",
    }),
    update: buildCrudSapAuditAction({
      area: "erp",
      module: "hrm",
      object: "organization.reporting_relationship",
      verb: "update",
    }),
  },
} as const
