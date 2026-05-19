/**
 * Nexus — operational origin field of the organization.
 *
 * Public RSC + composition door. Used by:
 *   - `app/[locale]/o/[orgSlug]/nexus/page.tsx` (the Nexus Field route)
 *   - dashboard / module path builders that need to reach the Nexus root
 *
 * Server-only data lives in **`#features/nexus/server`**. Client islands import
 * narrow types + helpers from **`#features/nexus/client`** (when added).
 *
 * Doctrine: Nexus owns the OS. Surfaces execute work. Dashboard chrome is being
 * demoted. See AGENTS.md §5 → Nexus runtime (org root).
 */

export {
  organizationNexusPath,
  NEXUS_SURFACE_KINDS,
  NEXUS_PRESSURE_SEVERITIES,
  NEXUS_PRIORITY_LANE_KINDS,
} from "./constants"
export {
  NEXUS_LIST_PRESENTATION,
  NEXUS_PRESSURE_SURFACE_KEY,
  NEXUS_PRIORITY_LANES_SURFACE_KEY,
  NEXUS_RESOLUTIONS_SURFACE_KEY,
  type NexusListSurfaceBundle,
} from "./data/nexus-list-surface.shared"
export {
  NEXUS_RIGHT_RAIL_VISIBLE_LIMIT,
  NEXUS_UTILITY_CATALOG,
  NEXUS_UTILITY_MARKETPLACE_REQUEST_KIND,
  NEXUS_UTILITY_MARKETPLACE_SOURCE,
  NEXUS_RIGHT_UTILITY_WIDGET_IDS,
  getNexusUtilityCatalogEntry,
  isInstalledNexusRightUtilityWidgetId,
  isNexusRightUtilityAvailable,
} from "./data/utility-catalog.shared"

export type {
  LynxRuntimeState,
  NexusEnvironment,
  NexusFreshness,
  NexusPressureSeverity,
  NexusSnapshot,
  NexusState,
  NexusSurfaceKind,
  NexusSurfaceState,
  NexusSurfaceStatus,
  OperationalPressureItem,
  OperatorContext,
  OrgContext,
  PriorityLane,
  PriorityLaneKind,
  ResolutionEvent,
  SystemReadiness,
  SystemReadinessState,
} from "./types"
export type {
  NexusRightUtilityAvailabilityContext,
  NexusRightUtilityWidgetId,
  NexusUtilityCatalogEntry,
  NexusUtilityCatalogId,
  NexusUtilityCatalogItemKey,
  NexusUtilityIconKey,
  NexusUtilityMarketplaceStatus,
} from "./data/utility-catalog.shared"
