import { Suspense } from "react"
import { headers } from "next/headers"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import type { BreadcrumbSegment } from "#components/dashboard/breadcrumbs"
import { DashboardShell } from "#components/dashboard/dashboard-shell"
import { OrgSwitcherSkeleton } from "#components/dashboard/org-switcher-skeleton"
import { OrgSwitcherSlot } from "#components/dashboard/org-switcher-slot"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { canActInOrganization } from "#lib/auth"
import { AFENDA_PATHNAME_HEADER } from "#lib/auth/forwarded-path-headers.shared"
import { fetchOrgWorkbenchIdentity } from "#lib/auth/org-workbench.server"
import {
  DASHBOARD_NAV_MODULES,
  organizationDashboardPath,
  type DashboardNavModule,
} from "#lib/dashboard-module-paths"
import {
  ensureAppLocale,
  stripLeadingLocalePrefix,
} from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

/**
 * Reads the proxy-forwarded pathname header to identify which dashboard module
 * the current request is rendering, for breadcrumb labelling. Returns `null`
 * when the header is missing, the path doesn't sit under this org's dashboard,
 * or the segment isn't a registered nav module.
 */
function resolveCurrentDashboardModule(
  forwardedPathname: string | null,
  orgSlug: string
): DashboardNavModule | null {
  if (!forwardedPathname) return null
  const stripped = stripLeadingLocalePrefix(forwardedPathname)
  if (!stripped) return null
  const dashboardPrefix = `/o/${orgSlug}/dashboard`
  const tail = stripped.pathnameWithoutLocale
  if (tail !== dashboardPrefix && !tail.startsWith(`${dashboardPrefix}/`)) {
    return null
  }
  const after = tail.slice(dashboardPrefix.length)
  const next = after.split("/").filter(Boolean)[0]
  if (!next) return null
  return (DASHBOARD_NAV_MODULES as readonly string[]).includes(next)
    ? (next as DashboardNavModule)
    : null
}

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
  const [showOrgAdminLink, identity, tNav, requestHeaders] = await Promise.all([
    canActInOrganization(
      org.userId,
      org.user.role,
      org.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(org.organizationId),
    getTranslations("Dashboard.nav"),
    headers(),
  ])

  const orgName = identity?.name ?? orgSlug

  const currentModule = resolveCurrentDashboardModule(
    requestHeaders.get(AFENDA_PATHNAME_HEADER),
    orgSlug
  )

  const breadcrumbs: BreadcrumbSegment[] = [
    { label: orgName, href: organizationDashboardPath(orgSlug, "home") },
  ]
  if (currentModule) {
    breadcrumbs.push({ label: tNav(currentModule) })
  } else {
    breadcrumbs.push({ label: tNav("label") })
  }

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
        breadcrumbs={breadcrumbs}
        centerSlot={centerSlot}
        userId={org.userId}
        currentOrgId={org.organizationId}
      >
        {children}
      </DashboardShell>
    </RouteEnvelopeProvider>
  )
}
