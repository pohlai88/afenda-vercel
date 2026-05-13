/**
 * Capability Registry (`#features/marketplace`) — public RSC / module
 * barrel.
 *
 * Doctrinal anchor:
 *
 *   - AGENTS.md §5 (Marketplace surface — added in same change)
 *   - `marketplace.contract.ts` (categories + audit grammar)
 *   - `nexus-best-practices.mdc` (RSC default; client islands narrow)
 *
 * This barrel is import-safe from Server Components. Client islands
 * MUST go through `#features/marketplace/client` (narrow Server Action
 * + types surface) so Turbopack never bundles `server-only` queries
 * into a client chunk. Server composition (route layouts, RSC pages
 * that compose query helpers) goes through `#features/marketplace/server`.
 */

// ---------------------------------------------------------------------------
// Constants — categories + path builder + tuning
// ---------------------------------------------------------------------------

export {
  CAPABILITY_CATEGORIES,
  isCapabilityCategory,
  isMarketplaceRoute,
  marketplacePath,
  marketplaceRoute,
  MARKETPLACE_METRICS_K_ANONYMITY_THRESHOLD,
  MARKETPLACE_METRICS_REVALIDATE_SECONDS,
  MARKETPLACE_RAIL_VISIBLE_LIMIT,
} from "./constants"
export type { CapabilityCategory, MarketplaceRoute } from "./constants"

// ---------------------------------------------------------------------------
// Contract — audit grammar + namespace gate
// ---------------------------------------------------------------------------

export {
  MARKETPLACE_AUDIT_ACTIONS,
  MARKETPLACE_RESOURCE_TYPES,
  marketplaceAuditPrefixIsRegistered,
} from "./marketplace.contract"
export type {
  MarketplaceAuditAction,
  MarketplaceResourceType,
} from "./marketplace.contract"

// ---------------------------------------------------------------------------
// Types — DTOs + action result discriminated unions
// ---------------------------------------------------------------------------

export type {
  CapabilityChainMetrics,
  CapabilityDefinition,
  CapabilityViewerContext,
  DeleteOrgCapabilityPolicyResult,
  MarketplaceActionFailure,
  MarketplaceActionSuccess,
  OrgCapabilityPolicyRow,
  PolicyAudience,
  PolicyState,
  PreferenceState,
  ResolvedCapability,
  ResolvedCapabilitySet,
  ResolvedEffectiveState,
  ResolvedSource,
  SetOrgCapabilityPolicyResult,
  SetUserCapabilityPreferenceResult,
  UserCapabilityPreferenceRow,
} from "./types"

// ---------------------------------------------------------------------------
// Schemas — server-side trust boundaries (importable from RSC + tests)
// ---------------------------------------------------------------------------

export {
  preferenceStateSchema,
  userPreferenceInputSchema,
} from "./schemas/user-preference.schema"
export type { UserPreferenceInput } from "./schemas/user-preference.schema"

export {
  orgPolicyDeleteInputSchema,
  orgPolicyInputSchema,
  policyAudienceSchema,
  policyStateSchema,
} from "./schemas/org-policy.schema"
export type {
  OrgPolicyDeleteInput,
  OrgPolicyInput,
} from "./schemas/org-policy.schema"

// ---------------------------------------------------------------------------
// Catalog adapter — pure (no server-only)
// ---------------------------------------------------------------------------

export {
  getCapabilitiesForCategory,
  getCapabilityDefinition,
  getCapabilityDefinitions,
  isKnownCapabilityId,
} from "./data/capability-catalog.shared"

// ---------------------------------------------------------------------------
// Server Actions — re-exported here so RSC pages + the matching
// client barrel converge on one identity. The `"use server"`
// directive inside each action file is what makes them callable from
// client chunks; the `client.ts` barrel re-exports the same
// identities without dragging the rest of this graph along.
// ---------------------------------------------------------------------------

export { setUserCapabilityPreferenceAction } from "./actions/user-preference.actions"
export {
  deleteOrgCapabilityPolicyAction,
  setOrgCapabilityPolicyAction,
} from "./actions/org-policy.actions"

// ---------------------------------------------------------------------------
// Components — Server Components compose these directly. Client islands
// import the same symbols re-exported through `#features/marketplace/client`
// when needed (today: only the toggle button + view switcher + detail
// dialog need to land in client chunks, and they self-import via the
// `"use client"` directive at the file boundary).
// ---------------------------------------------------------------------------

export { CapabilityCard } from "./components/capability-card"
export type {
  CapabilityCardCopy,
  CapabilityCardProps,
} from "./components/capability-card"
export { CapabilityTable } from "./components/capability-table"
export type {
  CapabilityTableProps,
  CapabilityTableRowCopy,
} from "./components/capability-table"
export { MarketplaceShell } from "./components/marketplace-shell"
export type { MarketplaceShellProps } from "./components/marketplace-shell"
export { MarketplaceCategoryNav } from "./components/marketplace-category-nav"
export type {
  MarketplaceCategoryNavItem,
  MarketplaceCategoryNavProps,
} from "./components/marketplace-category-nav"
export { MarketplaceEmptyState } from "./components/marketplace-empty-state"
export type { MarketplaceEmptyStateProps } from "./components/marketplace-empty-state"
export { MarketplaceMetricsStrip } from "./components/marketplace-metrics-strip"
export type {
  MarketplaceMetricStrip,
  MarketplaceMetricsStripProps,
} from "./components/marketplace-metrics-strip"
export { CapabilityDetailDialog } from "./components/capability-detail-dialog.client"
export type {
  CapabilityDetailDialogCopy,
  CapabilityDetailDialogProps,
} from "./components/capability-detail-dialog.client"
export { CapabilityToggleButton } from "./components/capability-toggle-button.client"
export type { CapabilityToggleButtonProps } from "./components/capability-toggle-button.client"
export {
  MARKETPLACE_VIEW_PARAM,
  MarketplaceViewSwitcher,
  isMarketplaceViewMode,
} from "./components/marketplace-view-switcher.client"
export type {
  MarketplaceViewMode,
  MarketplaceViewSwitcherProps,
} from "./components/marketplace-view-switcher.client"

export {
  CAPABILITY_ICONS,
  CapabilityIcon,
  resolveCapabilityIcon,
} from "./components/capability-icon-map.shared"
export type { CapabilityIconProps } from "./components/capability-icon-map.shared"
export {
  buildCapabilityCardCopy,
  buildCapabilityTableRowCopy,
  buildMarketplaceCopySource,
  getCapabilityDisplayName,
} from "./components/capability-copy.shared"
export type { MarketplaceCopySource } from "./components/capability-copy.shared"
