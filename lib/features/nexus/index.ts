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
