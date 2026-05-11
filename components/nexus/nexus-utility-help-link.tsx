"use client"

import type { Route } from "next"
import { CircleHelp } from "lucide-react"
import { useTranslations } from "next-intl"

import { NexusUtilityRoundTooltipLink } from "./nexus-utility-round-tooltip-link"

/** Locale marketing home (overview + trust links). */
export function NexusUtilityHelpLink() {
  const t = useTranslations("Dashboard.shell.utilityBar")

  return (
    <NexusUtilityRoundTooltipLink
      href={"/" as Route}
      ariaLabel={t("help")}
      tooltip={t("helpTooltip")}
    >
      <CircleHelp
        className="size-[15px] shrink-0"
        aria-hidden
        strokeWidth={2}
      />
    </NexusUtilityRoundTooltipLink>
  )
}
