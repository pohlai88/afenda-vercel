/**
 * Public door for lib/features/operational-scope/.
 *
 * Exports for Server Components, layouts, and RSC pages.
 * Client Components must import from `#features/operational-scope/client` instead.
 */

export { resolveOperationalContext } from "./server"

export {
  listOrgScopePolicies,
  listUserOperationalScopes,
} from "./data/operational-scope.queries.server"

export { SCOPE_RAIL_VISIBLE_LIMIT, ORG_SCOPE_POLICIES } from "./constants"
export { OPERATIONAL_SCOPE_AUDIT_ACTIONS } from "./operational-scope.contract"
export type { OperationalScopeAuditAction } from "./operational-scope.contract"
export type {
  OrgScopePolicy,
  OrgScopePolicyAudience,
  UserOperationalScopeRow,
  OrgOperationalScopePolicyRow,
} from "./types"
