"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { useWorkbenchCommand } from "../workbench-command-context"
import { WorkbenchUtilityRoundTooltipButton } from "./workbench-utility-round-tooltip-button"

/**
 * Mobile-only search shortcut.
 * The center `WorkbenchCommandTrigger` is visible on sm+ — this icon surfaces
 * command palette access on narrow viewports where the center slot is hidden.
 * Hidden on sm and above via `sm:hidden`.
 */
export function WorkbenchUtilitySearchMobile() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const { openCommand } = useWorkbenchCommand()

  return (
    <WorkbenchUtilityRoundTooltipButton
      ariaLabel={t("search")}
      tooltip={t("searchTooltip")}
      onClick={openCommand}
      className="sm:hidden"
    >
      <Search className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipButton>
  )
}
