"use client"

import { ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { organizationAdminPath } from "#lib/dashboard-module-paths"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

/** Org admin Settings (admins / owners only). */
export function WorkbenchUtilityOrgSettingsLink({
  orgSlug,
}: {
  orgSlug: string
}) {
  const tAdmin = useTranslations("Dashboard.commandPalette.admin")
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const href = organizationAdminPath(orgSlug, "settings")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={href}
      ariaLabel={tAdmin("settings")}
      tooltip={tBar("settingsTooltip")}
    >
      <ShieldCheck
        className="size-[15px] shrink-0"
        aria-hidden
        strokeWidth={2}
      />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
