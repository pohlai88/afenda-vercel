"use client"

import type { ReactNode } from "react"

import type { UserOrgSummary } from "#features/org-admin/client"

import { WorkbenchAppLauncher } from "./workbench-app-launcher"
import { WorkbenchOrgCompanySwitch } from "./workbench-org-company-switch.client"
import { WorkbenchUtilityRailCollapse } from "./workbench-utility-rail-collapse"

type WorkbenchLeftUtilityBarProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userOrgs: UserOrgSummary[]
  showOrgLoadingBay?: boolean
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
export function WorkbenchLeftUtilityBar({
  orgSlug,
  orgName,
  orgId,
  userOrgs,
  showOrgLoadingBay = false,
  children,
}: WorkbenchLeftUtilityBarProps) {
  return (
    <div className="flex min-w-0 items-center justify-start gap-1.5">
      <WorkbenchUtilityRailCollapse />
      {children ?? (
        <>
          <WorkbenchOrgCompanySwitch
            orgId={orgId}
            orgName={orgName}
            userOrgs={userOrgs}
          />
          <WorkbenchAppLauncher
            orgSlug={orgSlug}
            orgName={orgName}
            showOrgLoadingBay={showOrgLoadingBay}
          />
        </>
      )}
    </div>
  )
}
