import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { DashboardModuleNav } from "#components/dashboard/module-nav"
import { DashboardTopBar } from "#components/dashboard/top-bar"
import { Card, CardContent, CardHeader } from "#components/ui/card"

type DashboardShellProps = {
  userEmail: string
  orgSlug: string
  showOrgAdminLink?: boolean
  children: ReactNode
}

export function DashboardShell({
  userEmail,
  orgSlug,
  showOrgAdminLink = false,
  children,
}: DashboardShellProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2">
              <AfendaBrandLockup className="max-w-[min(100%,260px)] sm:max-w-[280px]" />
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Afenda ERP
              </p>
            </div>
            <DashboardTopBar userEmail={userEmail} />
          </CardHeader>
          <CardContent className="pt-0">
            <DashboardModuleNav
              orgSlug={orgSlug}
              showOrgAdminLink={showOrgAdminLink}
            />
          </CardContent>
        </Card>
      </header>
      <main className="space-y-6">{children}</main>
    </div>
  )
}
