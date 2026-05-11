"use client"

import { PenLine } from "lucide-react"
import { useTranslations } from "next-intl"

import { useWorkbenchCommand } from "../workbench-command-context"
import { WorkbenchUtilityRoundTooltipButton } from "./workbench-utility-round-tooltip-button"

/**
 * Quick-create entry point.
 * Opens the command palette so operators can immediately begin
 * capturing a new item without navigating to a surface first.
 */
export function WorkbenchUtilityQuickCreate() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const { openCommand } = useWorkbenchCommand()

  return (
    <WorkbenchUtilityRoundTooltipButton
      ariaLabel={t("quickCreate")}
      tooltip={t("quickCreateTooltip")}
      onClick={openCommand}
    >
      <PenLine className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </WorkbenchUtilityRoundTooltipButton>
  )
}
