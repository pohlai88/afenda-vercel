import type { z } from "zod"

import type {
  CapabilityCategory,
  MarketplaceAuditAction,
  MarketplaceResourceType,
} from "./marketplace.contract"
import type {
  policyAudienceSchema,
  policyStateSchema,
} from "./schemas/org-policy.schema"
import type { preferenceStateSchema } from "./schemas/user-preference.schema"

/**
 * Capability Registry — application-layer DTOs and result unions.
 *
 * Resolver semantics map every capability to one effective state.
 * `mandatory` and `visible` capabilities are rendered; `hidden` and
 * `unavailable` are not. The `source` field tells the UI which layer
 * decided so admin / user surfaces can explain "why" without a
 * second query.
 */

// ---------------------------------------------------------------------------
// Capability definition (catalog adapter shape)
// ---------------------------------------------------------------------------

/**
 * Generic catalog entry that the resolver and the Marketplace UI
 * consume. `nexusUtilityId` is set only for entries adapted from
 * `NEXUS_UTILITY_CATALOG`; future categories that introduce their
 * own catalogs leave it `null`.
 */
export type CapabilityDefinition = {
  readonly id: string
  readonly category: CapabilityCategory
  readonly itemKey: string
  readonly iconKey: string
  /**
   * Stable priority for sort-when-equal (lower wins). Mirrors the
   * Nexus widget priority for `utilities` so the L1 rail's left-to-
   * right ordering does not change after the Marketplace ships.
   */
  readonly priority: number
  /**
   * `true` if the system default is to render this capability with
   * no per-user opt-in. Org policy can promote (`mandatory`) or
   * demote (`blocked`) this default.
   */
  readonly defaultVisible: boolean
  /** Whether users may toggle this capability. Mandatory items remain shown. */
  readonly customizable: boolean
  /** Runtime gates resolved against the viewer context. Fail closed. */
  readonly runtimeGates: {
    readonly adminOnly?: boolean
    readonly mobileOnly?: boolean
    readonly multiOrgOnly?: boolean
    readonly multiLocaleOnly?: boolean
  }
  /**
   * Origin tag — `"nexus-utility"` for entries adapted from
   * `NEXUS_UTILITY_CATALOG`, future tags as new categories register.
   * Used by the UI to pick the right detail-dialog renderer.
   */
  readonly source: "nexus-utility"
  /** Set when adapted from `NEXUS_UTILITY_CATALOG`. */
  readonly nexusUtilityId: string | null
}

// ---------------------------------------------------------------------------
// Policy / preference DTOs (DB-projected)
// ---------------------------------------------------------------------------

export type PolicyState = z.infer<typeof policyStateSchema>
export type PolicyAudience = z.infer<typeof policyAudienceSchema>
export type PreferenceState = z.infer<typeof preferenceStateSchema>

export type OrgCapabilityPolicyRow = {
  readonly id: string
  readonly capabilityId: string
  readonly state: PolicyState
  readonly audience: PolicyAudience
  readonly updatedBy: string
  readonly updatedAt: Date
}

export type UserCapabilityPreferenceRow = {
  readonly id: string
  readonly capabilityId: string
  readonly state: PreferenceState
  readonly displayOrder: number
  readonly updatedAt: Date
}

// ---------------------------------------------------------------------------
// Viewer context — input to the resolver
// ---------------------------------------------------------------------------

export type CapabilityViewerContext = {
  readonly isAdmin: boolean
  readonly isMobile: boolean
  readonly multiOrg: boolean
  readonly multiLocale: boolean
}

// ---------------------------------------------------------------------------
// Resolver outputs — one entry per definition
// ---------------------------------------------------------------------------

export type ResolvedEffectiveState =
  | "mandatory"
  | "visible"
  | "hidden"
  | "unavailable"

export type ResolvedSource =
  | "runtime"
  | "org-policy"
  | "user-preference"
  | "system-default"

export type ResolvedCapability = {
  readonly definition: CapabilityDefinition
  readonly effective: ResolvedEffectiveState
  readonly source: ResolvedSource
  /**
   * Human-readable rationale (i18n-key resolution lives at the
   * render layer, not in the resolver). Stable string so contract
   * tests can snapshot deterministic explanations without coupling
   * to translated copy.
   */
  readonly reason: string
}

export type ResolvedCapabilitySet = {
  readonly resolved: readonly ResolvedCapability[]
  /**
   * Final set of capability ids the L1 rail should render, in
   * sorted-by-priority order, after applying the
   * `MARKETPLACE_RAIL_VISIBLE_LIMIT` cap. Mandatory entries take
   * precedence over visible entries when sorted by priority.
   */
  readonly visibleIds: readonly string[]
  readonly mandatoryIds: readonly string[]
}

// ---------------------------------------------------------------------------
// Server Action result discriminated unions
// ---------------------------------------------------------------------------

export type MarketplaceActionFailure = {
  readonly ok: false
  readonly code:
    | "validation"
    | "not_found"
    | "permission_denied"
    | "unknown_capability"
    | "unexpected"
  readonly message: string
}

export type MarketplaceActionSuccess = {
  readonly ok: true
  readonly code?: never
  readonly message?: never
}

export type SetUserCapabilityPreferenceResult =
  | (MarketplaceActionSuccess & {
      readonly preferenceId: string
      readonly state: PreferenceState
    })
  | MarketplaceActionFailure

export type SetOrgCapabilityPolicyResult =
  | (MarketplaceActionSuccess & {
      readonly policyId: string
      readonly state: PolicyState
      readonly audience: PolicyAudience
    })
  | MarketplaceActionFailure

export type DeleteOrgCapabilityPolicyResult =
  | MarketplaceActionSuccess
  | MarketplaceActionFailure

// ---------------------------------------------------------------------------
// Chain-wide metrics
// ---------------------------------------------------------------------------

export type CapabilityChainMetrics = {
  readonly capabilityId: string
  /** Distinct users with `state = visible`. `null` below the k-anonymity threshold. */
  readonly adoptingUsers: number | null
  /** Distinct orgs with at least one `state = visible` user preference. */
  readonly adoptingOrgs: number | null
  /** Distinct orgs whose org policy explicitly allows or mandates this capability. */
  readonly allowingOrgs: number | null
  readonly kAnonymityThreshold: number
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type {
  CapabilityCategory,
  MarketplaceAuditAction,
  MarketplaceResourceType,
}
export type {
  OrgPolicyDeleteInput,
  OrgPolicyInput,
} from "./schemas/org-policy.schema"
export type { UserPreferenceInput } from "./schemas/user-preference.schema"
