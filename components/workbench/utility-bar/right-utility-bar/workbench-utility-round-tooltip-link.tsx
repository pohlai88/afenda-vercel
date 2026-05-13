"use client"

import type { Route } from "next"
import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { Link } from "#i18n/navigation"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"

export type WorkbenchUtilityRoundTooltipLinkProps = {
  href: Route
  ariaLabel: string
  tooltip: string
  className?: string
  children: ReactNode
}

export function WorkbenchUtilityRoundTooltipLink({
  href,
  ariaLabel,
  tooltip,
  className,
  children,
}: WorkbenchUtilityRoundTooltipLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          prefetch={false}
          aria-label={ariaLabel}
          className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS, className)}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
