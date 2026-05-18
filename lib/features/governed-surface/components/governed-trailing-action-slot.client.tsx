"use client"

import type { ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components2/ui/tooltip"

import type { ListSurfaceRowTrailingAction } from "../schemas/list-surface-row-trailing-action.schema"
import { isListSurfaceTrailingActionRenderable } from "../list-surface-trailing-action.shared"

export type GovernedTrailingActionSlotProps = {
  trailingAction?: ListSurfaceRowTrailingAction
  children: ReactNode
}

/**
 * Wraps Pattern C trailing-column mutation UI with consistent disabled chrome
 * and tooltip copy from row metadata (`disabledReason`).
 */
export function GovernedTrailingActionSlot({
  trailingAction,
  children,
}: GovernedTrailingActionSlotProps) {
  if (!isListSurfaceTrailingActionRenderable(trailingAction)) {
    return null
  }

  const disabled = trailingAction.state === "disabled"
  const shell = (
    <span
      className={disabled ? "inline-flex opacity-60" : "inline-flex"}
      aria-disabled={disabled || undefined}
      data-trailing-action-state={trailingAction.state}
      data-action-descriptor-id={trailingAction.descriptor?.id}
    >
      {children}
    </span>
  )

  if (disabled && trailingAction.disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{shell}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-pretty">
          {trailingAction.disabledReason}
        </TooltipContent>
      </Tooltip>
    )
  }

  return shell
}
