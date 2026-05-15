"use client"

import type { ReactNode } from "react"

import { cn } from "#lib/utils"

import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppShellUtilityPanelProps = {
  /** The icon button that opens this panel. Must be a single element. */
  trigger: ReactNode
  /** Panel header title. */
  title: string
  /** Optional subtitle / description line. */
  description?: string
  /** Main panel body. */
  children: ReactNode
  /** Optional sticky footer row (actions, reset links, etc.). */
  footer?: ReactNode
  /** Popover alignment relative to the trigger. Default: "end". */
  align?: "start" | "center" | "end"
  /** Popover side relative to the trigger. Default: "bottom". */
  side?: "top" | "bottom" | "left" | "right"
  /** Offset in px from the trigger. Default: 10. */
  sideOffset?: number
  /** Panel width Tailwind class. Default: "w-80". */
  widthClass?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AppShellUtilityPanel
 *
 * Reusable Popover wrapper for all right-rail utility icon buttons.
 * Provides a consistent header / scrollable body / optional footer structure
 * so every panel (shortcuts, feedback, marketplace, etc.) looks identical.
 *
 * Usage:
 * ```tsx
 * <AppShellUtilityPanel trigger={<AppShellShortcutsIcon … />} title="Shortcuts">
 *   <ShortcutsBody />
 * </AppShellUtilityPanel>
 * ```
 */
export function AppShellUtilityPanel({
  trigger,
  title,
  description,
  children,
  footer,
  align = "end",
  side = "bottom",
  sideOffset = 10,
  widthClass = "w-80",
}: AppShellUtilityPanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "af-nexus-popover-panel bg-background/95 p-0",
          "flex flex-col overflow-hidden",
          "max-h-[min(85vh,36rem)]",
          widthClass
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {footer ? (
          <div className="shrink-0 border-t border-border/50 px-4 py-2.5">
            {footer}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
