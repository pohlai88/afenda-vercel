"use client"

import { useState } from "react"
import { Check, Rows3 } from "lucide-react"

import { cn } from "#lib/utils"
import {
  type UiDensity,
  uiDensityKeys,
  uiRadius,
  uiSurfaceElevation,
} from "#lib/design-system"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"
import { useAppShellStore } from "../stores/app-shell.store"

// ---------------------------------------------------------------------------
// Copy + helpers
// ---------------------------------------------------------------------------

const DENSITY_COPY: Record<
  UiDensity,
  { title: string; description: string }
> = {
  compact: {
    title: "Compact",
    description: "Tighter rows and smaller gaps.",
  },
  comfortable: {
    title: "Comfortable",
    description: "Default ERP rhythm.",
  },
  relaxed: {
    title: "Relaxed",
    description: "More breathing room.",
  },
}

/**
 * Directly set `data-density` on the main scroll pane without a React
 * re-render — safe for hover previews. Bypasses React intentionally so
 * each hover event costs zero re-renders.
 */
function applyDensityToDOM(d: UiDensity) {
  if (typeof document === "undefined") return
  document.getElementById("app-shell-main")?.setAttribute("data-density", d)
}

// ---------------------------------------------------------------------------

/**
 * Right-rail layout density panel.
 *
 * - Hover preview: hovering an option instantly applies that density to
 *   `#app-shell-main` via direct DOM attribute write (no React re-render).
 * - On leave / close, reverts to the committed density.
 * - Active option shows a Check icon + subtle background.
 * - Clicking commits the selection to the Zustand store.
 */
export function UtilityBarDensityPanel() {
  const density = useAppShellStore((s) => s.density)
  const setDensity = useAppShellStore((s) => s.setDensity)
  const [open, setOpen] = useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Panel closed — always revert DOM to committed density.
      applyDensityToDOM(density)
    }
  }

  function handleSelect(key: UiDensity) {
    setDensity(key)
    applyDensityToDOM(key)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Layout density"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <Rows3 strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Layout density
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-56 p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Layout density
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Hover to preview. Click to apply.
          </p>
        </div>

        {/* Option list — custom buttons for hover-preview control */}
        <div
          role="radiogroup"
          aria-label="Density options"
          className="py-1"
          onMouseLeave={() => applyDensityToDOM(density)}
        >
          {uiDensityKeys.map((key) => {
            const copy = DENSITY_COPY[key]
            const isActive = density === key

            return (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onMouseEnter={() => applyDensityToDOM(key)}
                onClick={() => handleSelect(key)}
                className={cn(
                  "relative mx-1 mb-0.5 flex w-[calc(100%-0.5rem)] flex-col items-start rounded-lg px-3 py-2",
                  "text-left transition-colors duration-100 outline-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-accent/25"
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isActive ? "text-foreground" : "text-foreground/80"
                    )}
                  >
                    {copy.title}
                  </span>
                  {isActive ? (
                    <Check
                      className="size-3.5 shrink-0 text-primary"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                  {copy.description}
                </span>
              </button>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
