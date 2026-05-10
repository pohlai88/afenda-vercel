"use client"

import { PenLine } from "lucide-react"
import { useTranslations } from "next-intl"

import { useNexusCommand } from "./nexus-command-context"
import { NexusUtilityRoundTooltipButton } from "./nexus-utility-round-tooltip-button"

/**
 * Quick-create entry point.
 * Opens the command palette so operators can immediately begin
 * capturing a new item without navigating to a surface first.
 */
export function NexusUtilityQuickCreate() {
  const t = useTranslations("Dashboard.shell.utilityBar")
  const { openCommand } = useNexusCommand()

  return (
    <NexusUtilityRoundTooltipButton
      ariaLabel={t("quickCreate")}
      tooltip={t("quickCreateTooltip")}
      onClick={openCommand}
    >
      <PenLine className="size-[15px] shrink-0" aria-hidden strokeWidth={2} />
    </NexusUtilityRoundTooltipButton>
  )
}
