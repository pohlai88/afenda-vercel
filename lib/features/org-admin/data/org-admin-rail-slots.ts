import type {
  WorkbenchRailInbox,
  WorkbenchRailNavIconId,
  WorkbenchRailPin,
  WorkbenchRailRecent,
  WorkbenchRailSlots,
  WorkbenchRailView,
} from "#components/workbench/left-nav-rail"

import { ORG_ADMIN_CAPABILITIES, organizationAdminPath } from "../constants"
import type { OrgAdminNavKey, OrgAdminRailPressureMap } from "../types"

const NAV_KEY_ICONS: Record<string, WorkbenchRailNavIconId> = {
  members: "users",
  audit: "shield",
  feedback: "messages-square",
  integrations: "plug",
  settings: "settings",
}

/**
 * Builds `WorkbenchRailSlots` for the organizational control plane.
 *
 * Pure function — no DB, no headers, no clock reads. Accepts:
 *
 *   1. Optional **pressure** badges resolved by
 *      `getOrgAdminRailPressureCounts(organizationId)` (Phase 2).
 *   2. Optional **memory** slots resolved by `#features/rail-memory`
 *      (Phase 3d): a single `inbox` summary, plus `pinned` / `views` /
 *      `recents` arrays already mapped to kernel slot shape.
 *
 * Phase 2 doctrine (see `docs/_draft/working-memory-rail-plan.md` §10):
 *
 *   - Badges only render when pressure is present — `pressure` is sparse
 *     by design. Empty slots hide entirely (conditional density).
 *   - Every emitted badge carries `tone` (semantic urgency); the
 *     threshold helpers in `org-admin-rail-pressure.shared.ts` are the
 *     only legitimate producer of `attention` / `critical`.
 *   - This builder remains a pure mapper. It does not invent badges,
 *     does not call DB, and does not duplicate work the shell renders.
 *
 * Phase 3d additions:
 *
 *   - Memory slots are passed straight through to the kernel parser.
 *     The same conditional-density rule applies: callers MUST pass an
 *     empty array (or `undefined`) when they have no memory to surface;
 *     the kernel `workbenchRailSlotsDataSchema` rejects empty arrays at
 *     parse time so a builder regression cannot leak a hollow section.
 *   - The builder converts empty arrays to `undefined` for the same
 *     reason: the `WorkbenchRail` UI sections short-circuit on
 *     `slot === undefined`, but treating `[]` as "present-but-empty"
 *     would render a heading-less wrapper. Centralizing the conversion
 *     here means every caller stays simple.
 */
export function buildOrgAdminRailSlots({
  orgSlug,
  orgName,
  pressure,
  inbox,
  pinned,
  views,
  recents,
}: {
  orgSlug: string
  orgName: string
  /**
   * Sparse pressure map keyed by `OrgAdminNavKey`. `undefined` entries
   * yield no badge — calmer rails reflect calmer state.
   */
  pressure?: OrgAdminRailPressureMap
  /**
   * Optional inbox slot (single linkable pressure summary). Derived in
   * the layout from the same `pressure` map via `deriveOrgAdminInbox`.
   * `undefined` means no concern is at surfaceable pressure right now;
   * the rail omits the inbox row entirely.
   */
  inbox?: WorkbenchRailInbox | null
  /**
   * Pinned records, already mapped to kernel slot shape via
   * `pinDtoToSlot` in the layout. Pass `undefined` or `[]` when the
   * operator has no pins — both collapse to "no pinned section."
   */
  pinned?: ReadonlyArray<WorkbenchRailPin>
  /**
   * Saved views, already mapped to kernel slot shape via
   * `viewDtoToSlot`. Same `undefined`/`[]` semantics as `pinned`.
   */
  views?: ReadonlyArray<WorkbenchRailView>
  /**
   * Recent visits, already deduped and capped to
   * `RAIL_RECENT_SURFACE_LIMIT` (5) by `listRecentsForUser`, then
   * mapped to kernel slot shape via `recentDtoToSlot`. Same
   * `undefined`/`[]` semantics as `pinned`.
   */
  recents?: ReadonlyArray<WorkbenchRailRecent>
}): WorkbenchRailSlots {
  const navItems = ORG_ADMIN_CAPABILITIES.filter((c) => c.nav != null).map(
    (capability) => {
      const nav = capability.nav!
      const navKey = nav.navKey as OrgAdminNavKey
      const badge = pressure?.[navKey]
      return {
        id: capability.id,
        label: navKey.charAt(0).toUpperCase() + navKey.slice(1),
        href: organizationAdminPath(orgSlug, nav.primarySegment),
        icon: NAV_KEY_ICONS[navKey] ?? "building",
        ...(badge ? { badge } : {}),
      }
    }
  )

  const overviewItem = {
    id: "overview",
    label: "Overview",
    href: organizationAdminPath(orgSlug, "overview"),
    icon: "building" as const,
  }

  // Conditional density: collapse empty arrays to `undefined` so the
  // rail UI hides the section entirely. Kernel parser rejects empty
  // arrays as well — this matches the kernel contract proactively.
  const pinnedSlot =
    pinned && pinned.length > 0 ? Array.from(pinned) : undefined
  const viewsSlot = views && views.length > 0 ? Array.from(views) : undefined
  const recentsSlot =
    recents && recents.length > 0 ? Array.from(recents) : undefined

  return {
    identity: {
      initial: orgName.trim().slice(0, 1).toUpperCase() || "O",
      primary: orgName,
      secondary: orgSlug,
    },
    nav: [
      {
        id: "org-admin",
        items: [overviewItem, ...navItems],
      },
    ],
    ...(inbox ? { inbox } : {}),
    ...(pinnedSlot ? { pinned: pinnedSlot } : {}),
    ...(viewsSlot ? { views: viewsSlot } : {}),
    ...(recentsSlot ? { recents: recentsSlot } : {}),
  }
}
