"use client"

import { useCallback, useMemo, useState } from "react"

import { LynxSummon } from "#components/nexus/nexus-lynx-summon.client"
import { LynxSummonProvider } from "#components/nexus/nexus-lynx-summon-context"
import { cn } from "#lib/utils"

import { WorkbenchRail } from "./rail/workbench-rail"
import { WorkbenchCommandProvider } from "./workbench-command-context"
import { WorkbenchDock } from "./workbench-dock"
import { WorkbenchGlobalShortcuts } from "./workbench-global-shortcuts.client"
import {
  WorkbenchMobileRailProvider,
  WorkbenchMobileRailSheet,
} from "./workbench-mobile-rail"
import { WorkbenchSkipToMain } from "./workbench-skip-to-main"
import type { WorkbenchShellProps } from "./workbench-shell.types"
import {
  WorkbenchRailCollapseUiProvider,
  WORKBENCH_RAIL_NAV_DOM_ID,
  type WorkbenchRailCollapseApi,
} from "./workbench-rail-collapse-context"

const DEFAULT_STORAGE_KEY = "afenda.workbench.rail.collapsed"

function WorkbenchShellInner({
  skipToMainLabel,
  utilityBar,
  rail,
  commandLayer,
  dock,
  enableLynxSummon,
  orgSlug,
  children,
}: WorkbenchShellProps) {
  const [railCollapsed, setRailCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      const key = rail?.storageKey ?? DEFAULT_STORAGE_KEY
      return localStorage.getItem(key) === "true"
    } catch {
      return false
    }
  })

  const toggleRail = useCallback(() => {
    setRailCollapsed((prev) => {
      const next = !prev
      try {
        const key = rail?.storageKey ?? DEFAULT_STORAGE_KEY
        localStorage.setItem(key, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [rail])

  const shellRailCollapseApi = useMemo<WorkbenchRailCollapseApi | null>(() => {
    if (!rail) return null
    return {
      collapsed: railCollapsed,
      toggleCollapse: toggleRail,
      collapseLabel: rail.labels.collapseLabel,
      expandLabel: rail.labels.expandLabel,
      controlsNavId: WORKBENCH_RAIL_NAV_DOM_ID,
    }
  }, [
    rail,
    railCollapsed,
    toggleRail,
  ])

  const shellContent = (
    <WorkbenchRailCollapseUiProvider shellApi={shellRailCollapseApi}>
      <WorkbenchMobileRailProvider>
        <div
          className="flex min-h-svh flex-col bg-background"
          data-workbench-capture-root="workspace"
        >
          <WorkbenchSkipToMain label={skipToMainLabel} />

          {/* L1 Utility Bar */}
          {utilityBar}

          {/* Org-scoped global keyboard shortcuts */}
          {orgSlug && <WorkbenchGlobalShortcuts orgSlug={orgSlug} />}

          {/*
         * Main layout: rail (optional) + content.
         *
         * When a rail is mounted we tint the row container with the rail's
         * chrome color (`md:bg-sidebar`). The surface wrapper below carves
         * a rounded top-left corner out of its own `bg-background`; the
         * curve's cut-out reveals this row container, so the empty corner
         * reads as the rail color (chrome) rather than a stray page-bg
         * triangle (which made the curve look broken at the seam).
         */}
          <div
            className={cn(
              "flex min-h-0 flex-1",
              rail ? "overflow-hidden md:bg-sidebar" : undefined
            )}
          >
            {/* Desktop rail */}
            {rail ? (
              <>
                <div className="hidden flex-none md:flex">
                  <WorkbenchRail
                    slots={rail.slots}
                    labels={rail.labels}
                    collapsed={railCollapsed}
                  />
                </div>

                {/* Mobile rail sheet */}
                <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
                  <WorkbenchRail
                    slots={rail.slots}
                    labels={rail.labels}
                    collapsed={false}
                    assignNavLandmarkId={false}
                  />
                </WorkbenchMobileRailSheet>
              </>
            ) : null}

            {/*
           * Surface content area.
           *
           * When a rail is mounted we soften the inner boundary against the
           * rail with a top-left curve (desktop only). The curve is owned
           * by a thin wrapper so `<main>` keeps its scroll contract intact:
           *   - wrapper: `md:rounded-tl-2xl` + `md:overflow-hidden` clips
           *     `<main>` (and its sticky surface header) into the curve.
           *   - `<main>`: keeps `overflow-y-auto` for content scroll; the
           *     wrapper's overflow only clips the rounded edge.
           *   - `bg-background` on the wrapper paints the content panel;
           *     the row container behind it carries `md:bg-sidebar` so
           *     the curve's cut-out matches the rail chrome.
           * No competing border-top / border-left on this wrapper — the utility
           * bar hairline defines the horizontal seam vs L1 chrome.
           * Without a rail the wrapper is invisible.
           */}
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col",
                rail
                  ? "bg-background md:overflow-hidden md:rounded-tl-2xl"
                  : undefined
              )}
            >
              <main
                id="dashboard-main"
                tabIndex={-1}
                className={cn(
                  "flex min-w-0 flex-1 flex-col overflow-y-auto outline-none",
                  rail ? "min-h-0" : undefined
                )}
                data-workbench-capture-root="content"
              >
                {children}
              </main>
            </div>
          </div>

          {/* Cross-cutting runtime services */}
          {commandLayer}
          {dock ?? <WorkbenchDock />}
          {enableLynxSummon && <LynxSummon />}
        </div>
      </WorkbenchMobileRailProvider>
    </WorkbenchRailCollapseUiProvider>
  )

  if (enableLynxSummon) {
    return <LynxSummonProvider>{shellContent}</LynxSummonProvider>
  }

  return shellContent
}

/**
 * WorkbenchShell — canonical post-login shell for every Afenda surface.
 *
 * Composes three regions:
 * 1. **Utility Bar** (top, full-width) — passed as `utilityBar` ReactNode
 * 2. **Rail** (left, optional) — configured via `rail` prop
 * 3. **Surface** (right, scrollable `<main>`) — `children`
 *
 * Plus cross-cutting runtime: skip-to-main, command layer, dock, global shortcuts,
 * Lynx summon (org surfaces only), mobile rail Sheet.
 *
 * Replaces `NexusShell`, `AccountOperatingShell`, `OrgAdminWorkbenchShell`,
 * `PlatformAdminShell`, `HrmShell`.
 */
export function WorkbenchShell(props: WorkbenchShellProps) {
  return (
    <WorkbenchCommandProvider>
      <WorkbenchShellInner {...props} />
    </WorkbenchCommandProvider>
  )
}

/** Re-export for convenience so layouts can import from one place. */
export type { WorkbenchShellProps } from "./workbench-shell.types"
