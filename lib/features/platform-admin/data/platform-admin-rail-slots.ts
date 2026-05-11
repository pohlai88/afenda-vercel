import { Building2Icon, ListIcon, UsersIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import type { WorkbenchRailSlots } from "#components/workbench"

import { PLATFORM_ADMIN_NAV_ITEMS, platformAdminPath } from "../constants"

const NAV_KEY_ICONS: Record<string, LucideIcon> = {
  users: UsersIcon,
  organizations: Building2Icon,
  overview: ListIcon,
}

/**
 * Builds WorkbenchRailSlots v2 from PLATFORM_ADMIN_CAPABILITIES.
 * Pure function — no DB calls.
 */
export function buildPlatformAdminRailSlots({
  userName,
  userEmail,
}: {
  userName: string | null
  userEmail: string
}): WorkbenchRailSlots {
  const initial = (userName ?? userEmail).trim().charAt(0).toUpperCase() || "O"

  const allNavItems = [
    {
      id: "overview",
      label: "Overview",
      href: platformAdminPath(),
      icon: ListIcon,
    },
    ...PLATFORM_ADMIN_NAV_ITEMS.map((item) => ({
      id: item.capabilityId,
      label: item.navKey.charAt(0).toUpperCase() + item.navKey.slice(1),
      href: item.href,
      icon: NAV_KEY_ICONS[item.navKey] ?? ListIcon,
    })),
  ]

  return {
    identity: {
      initial,
      primary: userName ?? "Operator",
      secondary: userEmail,
      pills: [{ label: "Operator", tone: "attention" }],
    },
    nav: [
      {
        id: "platform-admin",
        items: allNavItems,
      },
    ],
  }
}
