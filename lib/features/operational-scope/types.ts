/** Serializable scope definition row passed from RSC into client chrome. */
export type OperationalScopeCatalogEntry = {
  scopeType: string
  label: string
  iconName: string
  module: string
  available: boolean
}

/** Allowed policy values for org_operational_scope_policy.policy. */
export type OrgScopePolicy = "allowed" | "mandatory" | "blocked"

/** Audience filter for org_operational_scope_policy.audience. */
export type OrgScopePolicyAudience = "all" | "admin" | "member"

/**
 * A row from org_operational_scope_policy as returned by Drizzle.
 * `policy` and `audience` are narrower union types at the action-validation boundary
 * but Drizzle returns them as plain strings — callers should validate before narrowing.
 */
export type OrgOperationalScopePolicyRow = {
  id: string
  organizationId: string
  scopeType: string
  policy: string
  audience: string
  displayOrder: number
  updatedByUserId: string
  createdAt: Date
  updatedAt: Date
}

/** A row from user_operational_scope. */
export type UserOperationalScopeRow = {
  id: string
  organizationId: string
  userId: string
  scopeType: string
  selectedId: string | null
  selectedLabel: string | null
  selectedSlug: string | null
  displayOrder: number
  pinned: boolean
  createdAt: Date
  updatedAt: Date
}
