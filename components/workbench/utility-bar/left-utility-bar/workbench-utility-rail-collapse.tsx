"use client"

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"

import { cn } from "#lib/utils"

import { useWorkbenchRailCollapseApi } from "../../workbench-rail-collapse-context"

const UTILITY_RAIL_COLLAPSE_TRIGGER_CLASS = cn(
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
  "text-muted-foreground/80 transition-colors outline-none",
  "hover:bg-muted/60 hover:text-foreground",
  "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0"
)

/**
 * Desktop rail collapse — mirrored from the Codex-style rail trigger, placed
 * in L1 before the brand / nav so operators find it consistently. Mobile rail
 * remains the sheet (`WorkbenchMobileRailTrigger`).
 */
export function WorkbenchUtilityRailCollapse() {
  const api = useWorkbenchRailCollapseApi()
  if (!api) return null

  const {
    collapsed,
    toggleCollapse,
    collapseLabel,
    expandLabel,
    controlsNavId,
  } = api

  return (
    <button
      type="button"
      onClick={toggleCollapse}
      aria-label={collapsed ? expandLabel : collapseLabel}
      aria-expanded={!collapsed}
      aria-controls={controlsNavId}
      data-workbench-rail-trigger="true"
      className={cn(
        UTILITY_RAIL_COLLAPSE_TRIGGER_CLASS,
        "hidden md:inline-flex"
      )}
    >
      {collapsed ? (
        <PanelLeftOpenIcon className="h-4 w-4" aria-hidden />
      ) : (
        <PanelLeftCloseIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}
