"use client"

import type { ReactNode } from "react"

import { NexusNavPanel } from "./nexus-nav-panel"

type NexusUtilityLeftRailProps = {
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
export function NexusUtilityLeftRail({
  orgSlug,
  orgName,
  children,
}: NexusUtilityLeftRailProps) {
  return (
    <div className="flex min-w-0 items-center justify-start gap-1.5">
      {children ?? <NexusNavPanel orgSlug={orgSlug} orgName={orgName} />}
    </div>
  )
}
