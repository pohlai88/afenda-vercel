"use client"

import type { Route } from "next"
import { Building2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { WorkbenchUtilityRoundTooltipLink } from "./workbench-utility-round-tooltip-link"

/** Multi-org loading bay (`/console`) — left rail operational context. */
export function WorkbenchUtilityConsoleLink() {
  const t = useTranslations("Dashboard.shell.utilityBar")

  return (
    <WorkbenchUtilityRoundTooltipLink
      href={"/console" as Route}
      ariaLabel={t("console")}
      tooltip={t("consoleTooltip")}
    >
      <Building2 className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipLink>
  )
}
