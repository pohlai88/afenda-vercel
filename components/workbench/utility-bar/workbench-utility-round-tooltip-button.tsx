"use client"

import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "./workbench-utility-round-control-class"

type NexusUtilityRoundTooltipButtonProps = {
  ariaLabel: string
  tooltip: string
  onClick: () => void
  className?: string
  children: ReactNode
}

/** Icon-only action button with design-system tooltip (L1 utility bar). */
export function WorkbenchUtilityRoundTooltipButton({
  ariaLabel,
  tooltip,
  onClick,
  className,
  children,
}: NexusUtilityRoundTooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS, className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
