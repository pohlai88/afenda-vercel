"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"

import { cn } from "#lib/utils"

import { WorkbenchRail } from "./rail/workbench-rail"
import type { WorkbenchRailLabels, WorkbenchRailSlots } from "./rail"
import { WorkbenchMobileRailSheet } from "./workbench-mobile-rail"
import {
  WORKBENCH_RAIL_NAV_DOM_ID,
  useRegisterNestedWorkbenchRailCollapse,
  type WorkbenchRailCollapseApi,
} from "./workbench-rail-collapse-context"

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

  const toggleRail = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(rail.storageKey, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [rail.storageKey])

  const nestedRailCollapseApi = useMemo((): WorkbenchRailCollapseApi => {
    return {
      collapsed,
      toggleCollapse: toggleRail,
      collapseLabel: rail.labels.collapseLabel,
      expandLabel: rail.labels.expandLabel,
      controlsNavId: WORKBENCH_RAIL_NAV_DOM_ID,
    }
  }, [
    collapsed,
    rail.labels.collapseLabel,
    rail.labels.expandLabel,
    toggleRail,
  ])

  useRegisterNestedWorkbenchRailCollapse(nestedRailCollapseApi)

  return (
    <>
      {/*
       * Sub-layout row container — tinted with the rail's chrome color
       * on desktop so the surface wrapper's rounded-tl-2xl cut-out reveals
       * `bg-sidebar` (matching the rail), not a stray page-bg triangle.
       * Mirrors the seam treatment in `WorkbenchShell`.
       */}
      <div className="flex min-h-0 flex-1 overflow-hidden md:bg-sidebar">
        {/* Desktop rail */}
        <div className="hidden flex-none md:flex">
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={collapsed}
          />
        </div>

        {/* Mobile rail sheet — uses parent WorkbenchShell's MobileRailProvider */}
        <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={false}
            assignNavLandmarkId={false}
          />
        </WorkbenchMobileRailSheet>

        {/*
         * Content area.
         *
         * Mirrors `WorkbenchShell`'s surface chrome: a desktop curve
         * (`md:rounded-tl-2xl`) at the inner boundary against the rail.
         * Geometry ownership stays clean — the wrapper owns the curve and
         * clips it via `md:overflow-hidden`; the inner node owns scroll
         * with `overflow-y-auto`. The two never share an overflow
         * directive on the same element. No competing border — the parent
         * row carries `md:bg-sidebar` so the curve cut-out matches the
         * rail without needing an extra hairline.
         */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-background",
            "md:overflow-hidden md:rounded-tl-2xl"
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Command palette — connects to parent WorkbenchShell's CommandProvider */}
      {commandLayer}
    </>
  )
}
