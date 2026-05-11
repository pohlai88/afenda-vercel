"use client"

import { useState, type ReactNode } from "react"

import { WorkbenchRail } from "./rail/workbench-rail"
import type { WorkbenchRailLabels, WorkbenchRailSlots } from "./rail"
import { WorkbenchMobileRailSheet } from "./workbench-mobile-rail"

export type WorkbenchSubLayoutProps = {
  /**
   * Rail configuration. WorkbenchSubLayout is only needed when a rail is
   * required — use it inside an org route that already has a WorkbenchShell.
   */
  rail: {
    slots: WorkbenchRailSlots
    labels: WorkbenchRailLabels
    storageKey: string
  }

  /**
   * Route-scoped command palette pre-configured by the layout.
   * Connects to the parent WorkbenchShell's WorkbenchCommandProvider context.
   */
  commandLayer?: ReactNode

  children: ReactNode
}

/**
 * WorkbenchSubLayout — rail + content arrangement for layouts that nest
 * inside an existing WorkbenchShell (org admin, HRM, etc.).
 *
 * Unlike WorkbenchShell, this does NOT render the outer viewport wrapper,
 * utility bar, dock, skip-to-main, or Lynx summon (those are owned by the
 * parent WorkbenchShell at the `[orgSlug]/layout.tsx` level).
 *
 * It renders ONLY:
 * - Left rail (desktop: visible; mobile: Sheet using parent's mobile rail context)
 * - Right content area (children flow naturally, parent main handles scroll)
 * - Optional command palette layer (uses parent's WorkbenchCommandProvider)
 */
export function WorkbenchSubLayout({
  rail,
  commandLayer,
  children,
}: WorkbenchSubLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(rail.storageKey) === "true"
    } catch {
      return false
    }
  })

  const toggleRail = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(rail.storageKey, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop rail */}
        <div className="hidden flex-none md:flex">
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={collapsed}
            onToggleCollapse={toggleRail}
          />
        </div>

        {/* Mobile rail sheet — uses parent WorkbenchShell's MobileRailProvider */}
        <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={false}
            onToggleCollapse={() => {}}
          />
        </WorkbenchMobileRailSheet>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Command palette — connects to parent WorkbenchShell's CommandProvider */}
      {commandLayer}
    </>
  )
}
