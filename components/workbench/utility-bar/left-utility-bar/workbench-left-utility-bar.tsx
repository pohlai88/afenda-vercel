"use client"

import type { ReactNode } from "react"

import type { UserOrgSummary } from "#features/org-admin/client"
import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"
import { OperationalScopeRail } from "#features/operational-scope/client"

import { WorkbenchAppLauncher } from "./workbench-app-launcher"
import { WorkbenchOrgCompanySwitch } from "./workbench-org-company-switch.client"
import { WorkbenchUtilityRailCollapse } from "./workbench-utility-rail-collapse"

type WorkbenchLeftUtilityBarProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userOrgs: UserOrgSummary[]
  showOrgLoadingBay?: boolean
  /** Resolved operational context from the Tier B fetch. See ADR-0019. */
  operationalContext?: ResolvedOperationalContext | null
  /**
   * Override the default NavPanel with workspace-level switcher content
   * (future: multi-project / multi-team / multi-company picker).
   */
  children?: ReactNode
}

/**
 * Left rail — workspace context zone.
 *
 * Renders the brand + module nav panel and the ERP operational scope path bar
 * (ADR-0019). The path bar shows up to 5 scope dimensions as a borderless
 * breadcrumb path — project / team / period / etc.
 *
 * Scope policy administration is owned by the Scale (policy) icon disc
 * in the shell utility bar — not by this rail.
 */
export function WorkbenchLeftUtilityBar({
  orgSlug,
  orgName,
  orgId,
  userOrgs,
  showOrgLoadingBay = false,
  operationalContext = null,
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
      <OperationalScopeRail operationalContext={operationalContext} />
    </div>
  )
}
