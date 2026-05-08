import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { DashboardShell } from "#components/dashboard/dashboard-shell"
import { OrgSwitcherSkeleton } from "#components/dashboard/org-switcher-skeleton"
import { OrgSwitcherSlot } from "#components/dashboard/org-switcher-slot"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { canActInOrganization } from "#lib/auth"
import { fetchOrgWorkbenchIdentity } from "#lib/auth/org-workbench.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
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
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  const org = await requireOrgSession()

  // Tier A — minimum blocking authority required to establish the route contract.
  // The shell cannot render without these; nothing else belongs here.
  const [showOrgAdminLink, identity, tNav] = await Promise.all([
    canActInOrganization(
      org.userId,
      org.user.role,
      org.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(org.organizationId),
    getTranslations("Dashboard.nav"),
  ])

  const orgName = identity?.name ?? orgSlug

  const envelope: RouteEnvelope = {
    surface: "dashboard",
    locale,
    orgSlug,
    orgId: org.organizationId,
  }

  // Tier B — org switcher is shell enrichment, not shell authority.
  // Streams independently behind Suspense; the shell renders immediately.
  const centerSlot = (
    <Suspense fallback={<OrgSwitcherSkeleton />}>
      <OrgSwitcherSlot userId={org.userId} currentOrgId={org.organizationId} />
    </Suspense>
  )

  return (
    <RouteEnvelopeProvider value={envelope}>
      <DashboardShell
        userEmail={org.user.email}
        orgSlug={orgSlug}
        orgName={orgName}
        showOrgAdminLink={showOrgAdminLink}
        breadcrumbs={[{ label: orgName }, { label: tNav("label") }]}
        centerSlot={centerSlot}
        userId={org.userId}
        currentOrgId={org.organizationId}
      >
        {children}
      </DashboardShell>
    </RouteEnvelopeProvider>
  )
}
