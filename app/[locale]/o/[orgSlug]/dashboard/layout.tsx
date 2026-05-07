import type { ReactNode } from "react"
import type { Metadata } from "next"

import { DashboardShell } from "#components/dashboard/dashboard-shell"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
  openGraph: { title: `Dashboard | ${SITE_NAME}` },
}

export default async function OrgDashboardLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const org = await requireOrgSession()

  return (
    <DashboardShell userEmail={org.user.email} orgSlug={orgSlug}>
      {children}
    </DashboardShell>
  )
}
