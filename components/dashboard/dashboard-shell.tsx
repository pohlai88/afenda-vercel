import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { DashboardModuleNav } from "#components/dashboard/module-nav"
import { DashboardTopBar } from "#components/dashboard/top-bar"
import { cn } from "#lib/utils"

type DashboardShellProps = {
  userEmail: string
  orgSlug: string
  showOrgAdminLink?: boolean
  children: ReactNode
  className?: string
}

export function DashboardShell({
  userEmail,
  orgSlug,
  showOrgAdminLink = false,
  children,
  className,
}: DashboardShellProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl space-y-6 px-4 py-8", className)}
    >
      <header className="rounded-2xl border border-border/80 bg-card shadow-elevation-1">
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <AfendaBrandLockup className="max-w-[min(100%,260px)] sm:max-w-[280px]" />

            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Afenda ERP
            </p>
          </div>

          <DashboardTopBar userEmail={userEmail} />

          <DashboardModuleNav
            orgSlug={orgSlug}
            showOrgAdminLink={showOrgAdminLink}
          />
        </div>
      </header>

      <main className="space-y-6">{children}</main>
    </div>
  )
}
