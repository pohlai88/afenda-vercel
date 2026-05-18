"use client"

import { Button } from "#components2/ui/button"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { isListSurfaceTrailingActionRenderable } from "#features/governed-surface"
import type { ListSurfaceRowTrailingAction } from "#features/governed-surface"

type GalleryPatternCTrailingCellProps = {
  trailingAction?: ListSurfaceRowTrailingAction
}

export function GalleryPatternCTrailingCell({
  trailingAction,
}: GalleryPatternCTrailingCellProps) {
  if (!isListSurfaceTrailingActionRenderable(trailingAction)) {
    return null
  }
  const disabled = trailingAction.state === "disabled"
  return (
    <GovernedTrailingActionSlot trailingAction={trailingAction}>
      <Button type="button" size="sm" variant="secondary" disabled={disabled}>
        Record step
      </Button>
    </GovernedTrailingActionSlot>
  )
}
