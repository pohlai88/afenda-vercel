import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for the operational-scope module.
 * CRUD-SAP verb `update` — built via {@link buildCrudSapAuditAction}.
 *
 * See ADR-0019 §4.2.
 */

export const OPERATIONAL_SCOPE_AUDIT_ACTIONS = {
  USER_SCOPE_UPDATE: buildCrudSapAuditAction({
    area: "erp",
    module: "operational_scope",
    object: "user_scope",
    verb: "update",
  }),
  ORG_POLICY_UPDATE: buildCrudSapAuditAction({
    area: "erp",
    module: "operational_scope",
    object: "org_policy",
    verb: "update",
  }),
} as const

export type OperationalScopeAuditAction =
  (typeof OPERATIONAL_SCOPE_AUDIT_ACTIONS)[keyof typeof OPERATIONAL_SCOPE_AUDIT_ACTIONS]
