"use client"

import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#components2/ui/tooltip"

type AskLynxTooltipProps = {
  label: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "center" | "end" | "start"
  sideOffset?: number
  disabled?: boolean
  children: ReactElement
}

/** Consistent tooltip chrome for Ask Lynx panel controls. */
export function AskLynxTooltip({
  label,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  disabled = false,
  children,
}: AskLynxTooltipProps) {
  const trigger = disabled ? (
    <span className="inline-flex cursor-not-allowed" tabIndex={0}>
      {children}
    </span>
  ) : (
    children
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
