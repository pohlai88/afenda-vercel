"use client"

import type { ReactNode } from "react"

import { WorkbenchUtilityRailCollapse } from "./workbench-utility-rail-collapse"
import { WorkbenchNavPanel } from "./workbench-nav-panel"

type WorkbenchUtilityLeftRailProps = {
  orgSlug: string
  orgName: string
  /**
   * Override the default NavPanel with workspace-level switcher content
   * (future: multi-project / multi-team / multi-company picker).
   */
  children?: ReactNode
}

/**
 * Left rail — workspace context zone.
 *
 * Currently renders the brand + module nav panel.
 * Reserved for workspace-level switchers: org, project, team.
 * Operational shortcuts and personal utilities live on the right rail.
 */
export function WorkbenchUtilityLeftRail({
  orgSlug,
  orgName,
  children,
}: WorkbenchUtilityLeftRailProps) {
  return (
    <div className="flex min-w-0 items-center justify-start gap-1.5">
      <WorkbenchUtilityRailCollapse />
      {children ?? <WorkbenchNavPanel orgSlug={orgSlug} orgName={orgName} />}
    </div>
  )
}
