"use client"

import { Store } from "lucide-react"
import { useTranslations } from "next-intl"

import { organizationAdminPath } from "#lib/dashboard-module-paths"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

export function WorkbenchUtilityMarketplaceLink({
  orgSlug,
}: {
  orgSlug: string
}) {
  const tAdmin = useTranslations("OrgAdmin.integrations.marketplace")
  const tBar = useTranslations("Dashboard.shell.utilityBar")
  const href = organizationAdminPath(orgSlug, "integrations")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={href}
      ariaLabel={tAdmin("title")}
      tooltip={tBar("marketplaceTooltip")}
    >
      <Store className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
