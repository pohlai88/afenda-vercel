/**
 * Maximum number of scope pills shown simultaneously in the utility bar rail.
 * This is a UI-layer cap only — the DB is unbounded. When the user has more
 * pinned scopes than this limit, an overflow affordance is shown.
 */
export const SCOPE_RAIL_VISIBLE_LIMIT = 5

/** Allowed policy values (mirrors OrgScopePolicy type for runtime validation). */
export const ORG_SCOPE_POLICIES = ["allowed", "mandatory", "blocked"] as const

/** Allowed audience values (mirrors OrgScopePolicyAudience for runtime validation). */
export const ORG_SCOPE_AUDIENCES = ["all", "admin", "member"] as const
