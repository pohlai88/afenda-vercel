"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"

import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { NexusUtilityRoundTooltipLink } from "./nexus-utility-round-tooltip-link"

/** Lynx (truth / machine layer). */
export function NexusUtilityInsightLink({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const href = organizationDashboardPath(orgSlug, "lynx")

  return (
    <NexusUtilityRoundTooltipLink
      href={href}
      ariaLabel={t("insight")}
      tooltip={t("insightTooltip")}
    >
      <Sparkles className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </NexusUtilityRoundTooltipLink>
  )
}
