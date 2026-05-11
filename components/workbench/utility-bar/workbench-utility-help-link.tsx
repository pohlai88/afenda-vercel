"use client"

import type { Route } from "next"
import { CircleHelp } from "lucide-react"
import { useTranslations } from "next-intl"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

/** Locale marketing home (overview + trust links). */
export function WorkbenchUtilityHelpLink() {
  const t = useTranslations("Dashboard.shell.utilityBar")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={"/" as Route}
      ariaLabel={t("help")}
      tooltip={t("helpTooltip")}
    >
      <CircleHelp
        className="size-[15px] shrink-0"
        aria-hidden
        strokeWidth={2}
      />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
