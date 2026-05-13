"use client"

import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"

type WorkbenchUtilityTriggerTooltipProps = {
  /** Hover / focus-visible description — must not be empty. */
  tooltip: string
  align?: "center" | "end" | "start"
  sideOffset?: number
  children: ReactElement
}

/**
 * Canonical Tooltip chrome for L1 utility rail overlay triggers (dropdown, popover).
 * Keeps `side`, `sideOffset`, and `align` consistent with {@link WorkbenchUtilityRoundTooltipButton}.
 */
export function WorkbenchUtilityTriggerTooltip({
  tooltip,
  align = "center",
  sideOffset = 8,
  children,
}: WorkbenchUtilityTriggerTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" align={align} sideOffset={sideOffset}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
