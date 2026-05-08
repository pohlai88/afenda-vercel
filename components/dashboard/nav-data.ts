import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Building2,
  Calculator,
  CheckSquare,
  Package,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react"

import {
  DASHBOARD_NAV_MODULES,
  organizationAdminPath,
  organizationDashboardPath,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  module: DashboardNavModule | "admin"
}

const MODULE_ICONS: Record<DashboardNavModule, LucideIcon> = {
  contacts: Users,
  todos: CheckSquare,
  knowledge: BookOpen,
  lynx: Sparkles,
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
  return DASHBOARD_NAV_MODULES.map((module) => ({
    label: labels[module],
    href: organizationDashboardPath(orgSlug, module),
    icon: MODULE_ICONS[module],
    module,
  }))
}

export function buildAdminNavItem(orgSlug: string, label: string): NavItem {
  return {
    label,
    href: organizationAdminPath(orgSlug, "overview"),
    icon: Building2,
    module: "admin",
  }
}
