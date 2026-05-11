"use client"

import { useState } from "react"

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

  const toggleRail = () => {
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
  }

  const shellContent = (
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

        {/* Main layout: rail (optional) + content */}
        <div
          className={cn(
            "flex min-h-0 flex-1",
            rail ? "overflow-hidden" : undefined
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
                  onToggleCollapse={toggleRail}
                />
              </div>

              {/* Mobile rail sheet */}
              <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
                <WorkbenchRail
                  slots={rail.slots}
                  labels={rail.labels}
                  collapsed={false}
                  onToggleCollapse={() => {}}
                />
              </WorkbenchMobileRailSheet>
            </>
          ) : null}

          {/* Surface content area */}
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

        {/* Cross-cutting runtime services */}
        {commandLayer}
        {dock ?? <WorkbenchDock />}
        {enableLynxSummon && <LynxSummon />}
      </div>
    </WorkbenchMobileRailProvider>
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
