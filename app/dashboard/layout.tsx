import type { ReactNode } from "react"
import type { Metadata } from "next"

import { requireOrgSession } from "#lib/tenant"
import { SITE_NAME } from "#lib/site"
import { DashboardShell } from "./_components/dashboard-shell"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
  openGraph: { title: `Dashboard | ${SITE_NAME}` },
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const org = await requireOrgSession()
  return <DashboardShell userEmail={org.user.email}>{children}</DashboardShell>
}
