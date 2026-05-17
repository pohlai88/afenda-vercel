/**
 * Client-safe barrel for operational-scope.
 *
 * Contains only: Server Actions (safe to call from Client Components) and
 * plain types (no `server-only` transitive imports).
 *
 * Do NOT import from this barrel in Server Components — use the index.ts barrel
 * or server.ts for server-only exports.
 */

export {
  pinScopeAction,
  unpinScopeAction,
  setUserScopeSelectionAction,
} from "./actions/user-scope.actions"

export { setOrgScopePolicyAction } from "./actions/admin-scope-policy.actions"

export {
  mergeRouteOperationalContext,
  paramsRecordToRouteSegments,
} from "./schemas/operational-scope-route.shared"
export { SCOPE_RAIL_VISIBLE_LIMIT } from "./constants"
export { OPERATIONAL_SCOPE_AUDIT_ACTIONS } from "./operational-scope.contract"
export type { UserScopeActionInput } from "./schemas/operational-scope.schemas"
export type {
  OperationalScopeCatalogEntry,
  OrgScopePolicy,
  OrgScopePolicyAudience,
  UserOperationalScopeRow,
  OrgOperationalScopePolicyRow,
} from "./types"

export { OperationalScopeRail } from "./components/operational-scope-rail.client"
export {
  OperationalScopeAdminConfigContent,
  type ActiveScopeEntry,
} from "./components/operational-scope-admin-config.client"
