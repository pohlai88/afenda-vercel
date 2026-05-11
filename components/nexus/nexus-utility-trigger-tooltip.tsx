"use client"

import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"

type NexusUtilityTriggerTooltipProps = {
  /** Hover / focus-visible description — must not be empty. */
  tooltip: string
  align?: "center" | "end" | "start"
  sideOffset?: number
  /**
   * Must be a single Radix overlay trigger (e.g. `DropdownMenuTrigger`,
   * `PopoverTrigger`) so `TooltipTrigger asChild` can merge props correctly.
   */
  children: ReactElement
}

/**
 * Canonical Tooltip chrome for L1 utility rail overlay triggers (dropdown, popover).
 * Keeps `side`, `sideOffset`, and `align` consistent with {@link NexusUtilityRoundTooltipButton}.
 */
export function NexusUtilityTriggerTooltip({
  tooltip,
  align = "center",
  sideOffset = 8,
  children,
}: NexusUtilityTriggerTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" align={align} sideOffset={sideOffset}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
