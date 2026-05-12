import type {
  WorkbenchRailNavIconId,
  WorkbenchRailSlots,
} from "#components/workbench"

import {
  HRM_CAPABILITIES,
  organizationHrmPath,
  organizationHrmRootPath,
} from "../constants"
import type { HrmNavKey, HrmRailPressureMap } from "../types"

const NAV_KEY_ICONS: Record<string, WorkbenchRailNavIconId> = {
  employees: "users",
  leave: "calendar",
  attendance: "clock",
  payroll: "shopping-bag",
  compliance: "shield-check",
  documents: "file-text",
  policies: "briefcase",
  snapshot: "layout-dashboard",
}

/**
 * Builds WorkbenchRailSlots v2 from HRM_CAPABILITIES.
 *
 * **Pure mapper** — no DB calls, no IO. The shell schema is the kernel;
 * this function only maps from registry + optional pressure into the
 * schema. Pressure is computed once per request in
 * `hrm-rail-pressure.queries.server.ts` (Phase 2 doctrine — see
 * `docs/_draft/working-memory-rail-plan.md` §3.4).
 *
 * Labels are hardcoded (matching `messages/en.json Dashboard.Hrm.nav`
 * keys) since this is a pure function without translations context. The
 * layout is responsible for fetching translations and passing them via
 * `navLabels`.
 *
 * @param pressure  Optional per-nav-key pressure map. Sparse by design
 *                  — missing keys mean the corresponding nav item has
 *                  no badge (conditional density).
 */
export function buildHrmRailSlots({
  orgSlug,
  orgName,
  navLabels,
  pressure,
}: {
  orgSlug: string
  orgName: string
  /** Translated nav labels keyed by HRM nav key (e.g. employees, leave, etc.) */
  navLabels: Record<string, string>
  /** Optional pressure map produced by `getHrmRailPressureCounts`. */
  pressure?: HrmRailPressureMap
}): WorkbenchRailSlots {
  const initial = orgName.trim().charAt(0).toUpperCase() || "H"

  const overviewItem = {
    id: "hrm-overview",
    label: navLabels["overview"] ?? "Overview",
    href: organizationHrmRootPath(orgSlug) as string,
    icon: "layout-dashboard" as const,
  }

  const navItems = HRM_CAPABILITIES.map((capability) => {
    const navKey = capability.nav.navKey as HrmNavKey
    const badge = pressure?.[navKey]
    return {
      id: capability.id,
      label: navLabels[capability.nav.navKey] ?? capability.nav.navKey,
      href: organizationHrmPath(
        orgSlug,
        capability.nav.primarySegment
      ) as string,
      icon: NAV_KEY_ICONS[capability.nav.navKey] ?? "users",
      ...(badge ? { badge } : {}),
    }
  })

  return {
    identity: {
      initial,
      primary: orgName,
      secondary: "Human Resources",
    },
    nav: [
      {
        id: "hrm",
        label: "Human Resources",
        items: [overviewItem, ...navItems],
      },
    ],
  }
}
