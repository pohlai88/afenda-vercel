import type {
  WorkbenchRailNavIconId,
  WorkbenchRailSlots,
} from "#components/workbench/left-nav-rail"

import {
  HRM_CAPABILITIES,
  organizationHrmPath,
  organizationHrmRootPath,
} from "../constants"
import type {
  HrmCapability,
  HrmNavKey,
  HrmRailPressureMap,
} from "../types"

const NAV_KEY_ICONS: Record<string, WorkbenchRailNavIconId> = {
  employees: "users",
  organization: "building-2",
  onboarding: "list",
  recruitment: "users",
  leave: "calendar",
  attendance: "clock",
  benefits: "shield",
  claims: "file-text",
  payroll: "shopping-bag",
  performance: "activity",
  kpi: "monitor-smartphone",
  advances: "key-round",
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
  capabilities = HRM_CAPABILITIES,
  navLabels,
  pressure,
}: {
  orgSlug: string
  capabilities?: readonly HrmCapability[]
  /** Translated nav labels keyed by HRM nav key (e.g. employees, leave, etc.) */
  navLabels: Record<string, string>
  /** Optional pressure map produced by `getHrmRailPressureCounts`. */
  pressure?: HrmRailPressureMap
}): WorkbenchRailSlots {
  const overviewItem = {
    id: "hrm-overview",
    label: navLabels["overview"] ?? "Overview",
    href: organizationHrmRootPath(orgSlug) as string,
    icon: "layout-dashboard" as const,
  }

  const navItems = capabilities.map((capability) => {
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
    nav: [
      {
        id: "hrm",
        label: "Human Resources",
        items: [overviewItem, ...navItems],
      },
    ],
  }
}
