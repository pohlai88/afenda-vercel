"use client"

import type { Route } from "next"
import type { ReactNode } from "react"

import { Link } from "#i18n/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { cn } from "#lib/utils"

import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"

type NexusUtilityRoundTooltipLinkProps = {
  href: Route
  ariaLabel: string
  tooltip: string
  className?: string
  children: ReactNode
}

/** Icon-only locale link with design-system tooltip (L1 utility bar). */
export function NexusUtilityRoundTooltipLink({
  href,
  ariaLabel,
  tooltip,
  className,
  children,
}: NexusUtilityRoundTooltipLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          prefetch={false}
          aria-label={ariaLabel}
          className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS, className)}
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
