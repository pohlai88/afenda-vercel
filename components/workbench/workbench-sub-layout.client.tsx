"use client"

import type { ReactNode } from "react"

import { cn } from "#lib/utils"

import { WORKBENCH_CONTENT_PANE_INSET_CLASS } from "./utility-bar/workbench-utility-round-control-class"
import { WorkbenchRail } from "./left-nav-rail/workbench-rail"
import { WorkbenchMobileRailSheet } from "./workbench-mobile-rail"
import {
  useRegisterNestedWorkbenchRailCollapse,
  useWorkbenchRailCollapseState,
} from "./workbench-rail-collapse-context"
import type { WorkbenchShellRailConfig } from "./workbench-shell"

type WorkbenchSubLayoutClientProps = {
  rail: WorkbenchShellRailConfig | null
  commandLayer: ReactNode
  children: ReactNode
}

export function WorkbenchSubLayoutClient({
  rail,
  commandLayer,
  children,
}: WorkbenchSubLayoutClientProps) {
  const { railMode, railCollapseApi } = useWorkbenchRailCollapseState(
    rail
      ? {
          storageKey: rail.storageKey,
          collapseLabel: rail.labels.collapseLabel,
          expandLabel: rail.labels.expandLabel,
        }
      : null
  )

  useRegisterNestedWorkbenchRailCollapse(railCollapseApi)

  if (!rail) {
    return (
      <>
        {children}
        {commandLayer}
      </>
    )
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden md:bg-sidebar">
        <div className="hidden flex-none md:flex">
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={railMode !== "expanded"}
            interactionMode={railMode}
          />
        </div>

        <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
          <WorkbenchRail
            slots={rail.slots}
            labels={rail.labels}
            collapsed={false}
            interactionMode="expanded"
            assignNavLandmarkId={false}
          />
        </WorkbenchMobileRailSheet>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col bg-background",
            WORKBENCH_CONTENT_PANE_INSET_CLASS
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>

      {commandLayer}
    </>
  )
}
