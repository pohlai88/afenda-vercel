import type { ReactNode } from "react"

import { DashboardModuleNav } from "#components/dashboard/module-nav"
import { DashboardTopBar } from "#components/dashboard/top-bar"
import { Card, CardContent, CardHeader } from "#components/ui/card"

type DashboardShellProps = {
  userEmail: string
  children: ReactNode
}

export function DashboardShell({ userEmail, children }: DashboardShellProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <Card>
          <CardHeader className="gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Afenda ERP
            </p>
            <DashboardTopBar userEmail={userEmail} />
          </CardHeader>
          <CardContent className="pt-0">
            <DashboardModuleNav />
          </CardContent>
        </Card>
      </header>
      <main className="space-y-6">
        {children}
      </main>
    </div>
  )
}
