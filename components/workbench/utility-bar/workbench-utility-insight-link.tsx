"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

/** Lynx (truth / machine layer). */
export function WorkbenchUtilityInsightLink({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const href = organizationDashboardPath(orgSlug, "lynx")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={href}
      ariaLabel={t("insight")}
      tooltip={t("insightTooltip")}
    >
      <Sparkles className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
