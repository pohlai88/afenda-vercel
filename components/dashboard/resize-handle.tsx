"use client"

import { cn } from "#lib/utils"

import type { DragHandleProps } from "./use-resizable-width"

type ResizeHandleProps = DragHandleProps & {
  /** Which edge the handle sits on. Drives cursor and position classes. */
  edge: "right" | "left"
  className?: string
}

/**
 * Thin visual drag handle for sidebar/inspector resizing.
 *
 * Receives `dragHandleProps` from `useResizableWidth` and renders a 4px-wide
 * hit area with a 1px indicator line that appears on hover/focus/active.
 * Entirely presentational — all interaction logic lives in the hook.
 */
export function ResizeHandle({
  edge,
  className,
  ...dragHandleProps
}: ResizeHandleProps) {
  return (
    <div
      {...dragHandleProps}
      data-resize-handle
      data-edge={edge}
      className={cn(
        // Hit area: invisible 4px strip, vertically full-height
        "absolute inset-y-0 z-30 w-4 cursor-col-resize touch-none select-none",
        // Position by edge
        edge === "right"
          ? "-right-2 flex justify-end"
          : "-left-2 flex justify-start",
        // Focus ring
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
    >
      {/* 1px visual indicator — invisible until hover/focus/active */}
      <div
        aria-hidden
        className={cn(
          "h-full w-px transition-colors duration-150",
          "bg-transparent [[data-resize-handle]:hover_&]:bg-border",
          "[[data-resize-handle]:focus-visible_&]:bg-primary/60",
          "[[data-resize-handle]:active_&]:bg-primary"
        )}
      />
    </div>
  )
}
