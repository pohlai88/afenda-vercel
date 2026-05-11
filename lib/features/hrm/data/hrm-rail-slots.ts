import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { WorkbenchRailSlots } from "#components/workbench"

import {
  HRM_CAPABILITIES,
  organizationHrmPath,
  organizationHrmRootPath,
} from "../constants"

const NAV_KEY_ICONS: Record<string, LucideIcon> = {
  employees: UsersIcon,
  leave: CalendarIcon,
  attendance: ClockIcon,
  payroll: ShoppingBagIcon,
  compliance: ShieldCheckIcon,
  documents: FileTextIcon,
  policies: BriefcaseIcon,
  snapshot: LayoutDashboardIcon,
}

/**
 * Builds WorkbenchRailSlots v2 from HRM_CAPABILITIES.
 * Pure function — no DB calls.
 * Labels are hardcoded (matching messages/en.json Dashboard.Hrm.nav keys)
 * since this is a pure function without translations context.
 *
 * The layout is responsible for fetching translations if needed.
 * Currently mirrors `Dashboard.Hrm.nav` values directly.
 */
export function buildHrmRailSlots({
  orgSlug,
  orgName,
  navLabels,
}: {
  orgSlug: string
  orgName: string
  /** Translated nav labels keyed by HRM nav key (e.g. employees, leave, etc.) */
  navLabels: Record<string, string>
}): WorkbenchRailSlots {
  const initial = orgName.trim().charAt(0).toUpperCase() || "H"

  const overviewItem = {
    id: "hrm-overview",
    label: navLabels["overview"] ?? "Overview",
    href: organizationHrmRootPath(orgSlug) as string,
    icon: LayoutDashboardIcon,
  }

  const navItems = HRM_CAPABILITIES.map((capability) => ({
    id: capability.id,
    label: navLabels[capability.nav.navKey] ?? capability.nav.navKey,
    href: organizationHrmPath(orgSlug, capability.nav.primarySegment) as string,
    icon: NAV_KEY_ICONS[capability.nav.navKey] ?? UsersIcon,
  }))

  return {
    identity: {
      initial,
      primary: orgName,
      secondary: "Human Resources",
      pills: [{ label: "HRM", tone: "default" }],
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
