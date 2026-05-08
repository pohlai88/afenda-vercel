import type { Metadata } from "next"

import { DashboardShell } from "#components/dashboard/dashboard-shell"
import { canActInOrganization } from "#lib/auth"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const metadata: Metadata = {
  title: "Dashboard",
  openGraph: { title: `Dashboard | ${SITE_NAME}` },
}

export default async function OrgDashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard">) {
  const { orgSlug } = await params
  const org = await requireOrgSession()
  const showOrgAdminLink = await canActInOrganization(
    org.userId,
    org.user.role,
    org.organizationId,
    "admin"
  )

  return (
    <DashboardShell
      userEmail={org.user.email}
      orgSlug={orgSlug}
      showOrgAdminLink={showOrgAdminLink}
    >
      {children}
    </DashboardShell>
  )
}
