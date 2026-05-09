import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Brain,
  Building2,
  Calculator,
  CheckSquare,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react"

import {
  DASHBOARD_NAV_MODULES,
  organizationAdminPath,
  organizationDashboardPath,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"
import { LYNX_MODULE_NAV_ICON_PNG } from "#lib/site"

export type NavItem = {
  label: string
  href: string
  module: DashboardNavModule | "admin"
} & (
  | { navDisplay: "lucide"; icon: LucideIcon }
  | { navDisplay: "image"; imageSrc: string; imageAlt: string }
)

const MODULE_ICONS: Record<Exclude<DashboardNavModule, "lynx">, LucideIcon> = {
  contacts: Users,
  onething: CheckSquare,
  ithink: Brain,
  knowledge: BookOpen,
  sale: ShoppingCart,
  purchase: Package,
  inventory: Package,
  accounting: Calculator,
}

/**
 * Registry-aligned nav items for the primary sidebar.
 * Client-safe — no `server-only` imports.
 * `labels` is sourced from i18n at render time (passed in from the component).
 */
export function buildDashboardNavItems(
  orgSlug: string,
  labels: Record<DashboardNavModule, string>
): NavItem[] {
  return DASHBOARD_NAV_MODULES.map((module) => {
    if (module === "lynx") {
      return {
        label: labels[module],
        href: organizationDashboardPath(orgSlug, module),
        module,
        navDisplay: "image" as const,
        imageSrc: LYNX_MODULE_NAV_ICON_PNG,
        imageAlt: labels[module],
      }
    }
    return {
      label: labels[module],
      href: organizationDashboardPath(orgSlug, module),
      module,
      navDisplay: "lucide" as const,
      icon: MODULE_ICONS[module],
    }
  })
}

export function buildAdminNavItem(orgSlug: string, label: string): NavItem {
  return {
    label,
    href: organizationAdminPath(orgSlug, "overview"),
    module: "admin",
    navDisplay: "lucide",
    icon: Building2,
  }
}
