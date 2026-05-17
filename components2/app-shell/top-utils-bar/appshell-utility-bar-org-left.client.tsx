"use client"

import type { ReactNode } from "react"

import type { UserOrgSummary } from "#features/org-admin/client"
import type { ResolvedOperationalContext } from "#lib/erp/operational-context.shared"
import { OperationalScopeRail } from "#features/operational-scope/client"

import { AppShellAppLauncher } from "./appshell-app-launcher"
import { AppShellOrgCompanySwitch } from "./appshell-org-company-switch.client"

export type AppShellUtilityBarOrgLeftProps = {
  orgSlug: string
  orgName: string
  orgId: string
  userOrgs: UserOrgSummary[]
  showOrgLoadingBay?: boolean
  operationalContext?: ResolvedOperationalContext | null
  children?: ReactNode
}

export function AppShellUtilityBarOrgLeft({
  orgSlug,
  orgName,
  orgId,
  userOrgs,
  showOrgLoadingBay = false,
  operationalContext = null,
  children,
}: AppShellUtilityBarOrgLeftProps) {
  return (
    <div className="flex min-w-0 items-center justify-start gap-1.5">
      {children ?? (
        <>
          <AppShellOrgCompanySwitch
            orgId={orgId}
            orgName={orgName}
            userOrgs={userOrgs}
          />
          <AppShellAppLauncher
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
