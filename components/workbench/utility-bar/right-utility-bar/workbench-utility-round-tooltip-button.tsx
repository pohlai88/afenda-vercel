"use client"

import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"

export type WorkbenchUtilityRoundTooltipButtonProps = {
  ariaLabel: string
  tooltip: string
  onClick: () => void
  className?: string
  children: ReactNode
}

export function WorkbenchUtilityRoundTooltipButton({
  ariaLabel,
  tooltip,
  onClick,
  className,
  children,
}: WorkbenchUtilityRoundTooltipButtonProps) {
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
