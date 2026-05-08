"use client"

import { PanelRight, X } from "lucide-react"

import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"

import { useInspector } from "./inspector-context"
import { ResizeHandle } from "./resize-handle"
import { useResizableWidth } from "./use-resizable-width"

const INSPECTOR_DEFAULT_PX = 352 // 22rem
const INSPECTOR_MIN = 280
const INSPECTOR_MAX = 560

export const INSPECTOR_WIDTH_COOKIE = "inspector_width"

/**
 * Docked right inspector — **in-flow** `aside` with explicit width.
 *
 * Avoids nesting a second shadcn `Sidebar` here: its `fixed` + gap pattern is
 * built for the primary rail and can leave a dead column beside `main` inside
 * `SidebarInset`. Width animates to `0` when closed so `main` keeps full flex space.
 */
export function RightInspector({
  initialWidth,
}: {
  initialWidth?: number | null
}) {
  const { open, content, closeInspector } = useInspector()

  const { width, isDragging, dragHandleProps } = useResizableWidth({
    cookieName: INSPECTOR_WIDTH_COOKIE,
    defaultWidth: initialWidth ?? INSPECTOR_DEFAULT_PX,
    minWidth: INSPECTOR_MIN,
    maxWidth: INSPECTOR_MAX,
    side: "right",
  })

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "relative flex min-h-0 shrink-0 flex-col overflow-hidden border-l bg-card transition-[width] duration-200 ease-linear",
        open ? "border-border/80" : "border-transparent"
      )}
      style={{
        width: open ? width : 0,
      }}
    >
      {open ? (
        <>
          <ResizeHandle
            edge="left"
            {...dragHandleProps}
            aria-label="Resize inspector panel"
            data-dragging={isDragging || undefined}
          />
          <div className="flex shrink-0 flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Details</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={closeInspector}
              aria-label="Close inspector"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
            {content ?? (
              <p className="text-sm text-muted-foreground">
                Select a record to view details.
              </p>
            )}
          </div>
        </>
      ) : null}
    </aside>
  )
}

type InspectorTriggerProps = {
  /**
   * When set, renders an outlined toolbar button (icon + label). Use on the L2
   * breadcrumb row so the control is obvious — not confused with the nav
   * sidebar toggle (also an icon-only ghost button on L1).
   */
  label?: string
  /** Accessible name override when `label` is omitted (icon-only). */
  ariaLabelClosed?: string
  ariaLabelOpen?: string
}

/**
 * Toggle for the right Details inspector — icon-only by default; pass `label`
 * for a visible toolbar treatment (recommended on the breadcrumb sub-bar).
 */
export function InspectorTrigger({
  label,
  ariaLabelClosed = "Open inspector",
  ariaLabelOpen = "Close inspector",
}: InspectorTriggerProps) {
  const { toggleInspector, open } = useInspector()

  if (label) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-2"
        onClick={toggleInspector}
        aria-label={open ? ariaLabelOpen : ariaLabelClosed}
        aria-pressed={open}
      >
        <PanelRight className="size-4 shrink-0" aria-hidden />
        <span>{label}</span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0"
      onClick={toggleInspector}
      aria-label={open ? ariaLabelOpen : ariaLabelClosed}
      aria-pressed={open}
    >
      <PanelRight className="size-4 shrink-0" aria-hidden />
    </Button>
  )
}
