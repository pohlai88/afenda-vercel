"use client"

import { type ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"

type WorkbenchRailTooltipProps = {
  /** Hover / focus-visible description — only rendered when collapsed. */
  label: string
  /** Optional second line shown beneath the primary label. */
  description?: string
  /**
   * When false, returns the trigger directly without wrapping. Used for
   * expanded mode where the visible label is already the accessible name.
   */
  enabled: boolean
  /**
   * Must be a single ref-forwarding element so `TooltipTrigger asChild`
   * can attach the Radix props correctly (e.g. an `<a>` from `Link`).
   */
  children: ReactElement
}

/**
 * Right-side tooltip used by collapsed `WorkbenchRail` nav items.
 *
 * Centralized so every rail icon gets identical geometry, delay, and
 * description structure — keeps the collapsed rail readable without
 * leaning on raw `title` attributes.
 */
export function WorkbenchRailTooltip({
  label,
  description,
  enabled,
  children,
}: WorkbenchRailTooltipProps) {
  if (!enabled) return children

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] opacity-80">
            {description}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
