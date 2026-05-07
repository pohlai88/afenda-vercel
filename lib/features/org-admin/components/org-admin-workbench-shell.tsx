import type { ReactNode } from "react"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { Card, CardContent, CardHeader } from "#components/ui/card"

import { Link } from "#i18n/navigation"

import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { OrgAdminSidebar } from "./org-admin-sidebar"

export function OrgAdminWorkbenchShell({
  orgSlug,
  orgName,
  children,
}: {
  orgSlug: string
  orgName: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2">
              <Link
                href={organizationDashboardPath(orgSlug, "home")}
                className="w-fit rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <AfendaBrandLockup className="max-w-[min(100%,260px)] sm:max-w-[280px]" />
              </Link>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Organization admin
              </p>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {orgName}
                </h1>
                <p className="text-sm text-muted-foreground">Slug: {orgSlug}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-10">
              <OrgAdminSidebar
                orgSlug={orgSlug}
                className="lg:sticky lg:top-6 lg:self-start"
              />
              <div className="min-w-0 space-y-6">{children}</div>
            </div>
          </CardContent>
        </Card>
      </header>
    </div>
  )
}
