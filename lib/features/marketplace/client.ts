/**
 * Capability Registry — narrow client-safe surface.
 *
 * Client islands (the L1 utility-bar one-shot localStorage migrator,
 * the marketplace detail-dialog form, etc.) import from here, NOT
 * from `index.ts`. Reason: `index.ts` re-exports the catalog adapter
 * which transitively reads `NEXUS_UTILITY_CATALOG`. While the catalog
 * itself is client-safe today, future categories will adapt from
 * server-side sources; routing every island through this dedicated
 * barrel keeps client bundles deterministic.
 *
 * Forbidden imports here: query helpers, mappers, DB primitives,
 * server-only modules, Drizzle, `next/headers`.
 */

export { setUserCapabilityPreferenceAction } from "./actions/user-preference.actions"
export {
  deleteOrgCapabilityPolicyAction,
  setOrgCapabilityPolicyAction,
} from "./actions/org-policy.actions"

export type {
  DeleteOrgCapabilityPolicyResult,
  MarketplaceActionFailure,
  MarketplaceActionSuccess,
  PolicyAudience,
  PolicyState,
  PreferenceState,
  ResolvedCapability,
  ResolvedCapabilitySet,
  ResolvedEffectiveState,
  ResolvedSource,
  SetOrgCapabilityPolicyResult,
  SetUserCapabilityPreferenceResult,
} from "./types"

export { CapabilityToggleButton } from "./components/capability-toggle-button.client"
export type { CapabilityToggleButtonProps } from "./components/capability-toggle-button.client"

export type { UserPreferenceInput } from "./schemas/user-preference.schema"
export type {
  OrgPolicyDeleteInput,
  OrgPolicyInput,
} from "./schemas/org-policy.schema"

export {
  CAPABILITY_CATEGORIES,
  isCapabilityCategory,
  isMarketplaceRoute,
  organizationMarketplacePath,
  MARKETPLACE_RAIL_VISIBLE_LIMIT,
} from "./constants"
export type { CapabilityCategory, MarketplaceRoute } from "./constants"
