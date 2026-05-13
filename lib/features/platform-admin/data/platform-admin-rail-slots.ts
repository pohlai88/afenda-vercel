import type {
  WorkbenchRailNavIconId,
  WorkbenchRailSlots,
} from "#components/workbench/left-nav-rail"

import { PLATFORM_ADMIN_NAV_ITEMS, platformAdminPath } from "../constants"
import type {
  PlatformAdminNavKey,
  PlatformAdminRailPressureMap,
} from "../types"

const NAV_KEY_ICONS: Record<string, WorkbenchRailNavIconId> = {
  users: "users",
  organizations: "building-2",
  overview: "list",
}

/**
 * Builds WorkbenchRailSlots v2 from PLATFORM_ADMIN_CAPABILITIES.
 *
 * **Pure mapper** — no DB calls, no IO. The shell schema is the kernel;
 * this function only maps from registry + optional pressure into the
 * schema. Pressure is computed once per request in
 * `platform-admin-rail-pressure.queries.server.ts` (Phase 2 doctrine —
 * see `docs/_draft/working-memory-rail-plan.md` §3.4).
 *
 * @param pressure  Optional per-nav-key pressure map. Sparse by design
 *                  — missing keys mean the corresponding nav item has
 *                  no badge (conditional density).
 */
export function buildPlatformAdminRailSlots({
  pressure,
  pathForSegment = platformAdminPath,
}: {
  /** Optional pressure map produced by `getPlatformAdminRailPressureCounts`. */
  pressure?: PlatformAdminRailPressureMap
  pathForSegment?: (segment?: string) => string
}): WorkbenchRailSlots {
  const allNavItems = [
    {
      id: "overview",
      label: "Overview",
      href: pathForSegment(),
      icon: "list" as const,
    },
    ...PLATFORM_ADMIN_NAV_ITEMS.map((item) => {
      const badge = pressure?.[item.navKey as PlatformAdminNavKey]
      return {
        id: item.capabilityId,
        label: item.navKey.charAt(0).toUpperCase() + item.navKey.slice(1),
        href: pathForSegment(item.href.replace(/^\/operator\/?/, "")),
        icon: NAV_KEY_ICONS[item.navKey] ?? "list",
        ...(badge ? { badge } : {}),
      }
    }),
  ]

  return {
    nav: [
      {
        id: "platform-admin",
        items: allNavItems,
      },
    ],
  }
}
