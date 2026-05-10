"use client"

import { Plug } from "lucide-react"
import { useTranslations } from "next-intl"

import { organizationAdminPath } from "#lib/dashboard-module-paths"

import { NexusUtilityRoundTooltipLink } from "./nexus-utility-round-tooltip-link"

export function NexusUtilityIntegrationsLink({
  orgSlug,
}: {
  orgSlug: string
}) {
  const tAdmin = useTranslations("Dashboard.commandPalette.admin")
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const href = organizationAdminPath(orgSlug, "integrations")

  return (
    <NexusUtilityRoundTooltipLink
      href={href}
      ariaLabel={tAdmin("integrations")}
      tooltip={tBar("integrationsTooltip")}
    >
      <Plug className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </NexusUtilityRoundTooltipLink>
  )
}
