import {
  BuildingIcon,
  MessagesSquareIcon,
  PlugIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { WorkbenchRailSlots } from "#components/workbench"

import { ORG_ADMIN_CAPABILITIES, organizationAdminPath } from "../constants"

const NAV_KEY_ICONS: Record<string, LucideIcon> = {
  members: UsersIcon,
  audit: ShieldIcon,
  feedback: MessagesSquareIcon,
  integrations: PlugIcon,
  settings: SettingsIcon,
}

/**
 * Builds WorkbenchRailSlots v2 from ORG_ADMIN_CAPABILITIES.
 * Pure function — no DB calls.
 */
export function buildOrgAdminRailSlots({
  orgSlug,
  orgName,
}: {
  orgSlug: string
  orgName: string
}): WorkbenchRailSlots {
  const initial = orgName.trim().charAt(0).toUpperCase() || "O"

  const navItems = ORG_ADMIN_CAPABILITIES.filter((c) => c.nav != null).map(
    (capability) => {
      const nav = capability.nav!
      return {
        id: capability.id,
        label: nav.navKey.charAt(0).toUpperCase() + nav.navKey.slice(1),
        href: organizationAdminPath(orgSlug, nav.primarySegment),
        icon: NAV_KEY_ICONS[nav.navKey] ?? BuildingIcon,
      }
    }
  )

  const overviewItem = {
    id: "overview",
    label: "Overview",
    href: organizationAdminPath(orgSlug, "overview"),
    icon: BuildingIcon,
  }

  return {
    identity: {
      initial,
      primary: orgName,
      secondary: orgSlug,
      pills: [{ label: "Admin", tone: "attention" }],
    },
    nav: [
      {
        id: "org-admin",
        items: [overviewItem, ...navItems],
      },
    ],
  }
}
