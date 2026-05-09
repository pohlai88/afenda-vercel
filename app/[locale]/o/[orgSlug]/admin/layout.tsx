import type { Metadata } from "next"

import { notFound, redirect } from "next/navigation"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import {
  OrgAdminWorkbenchShell,
  organizationAdminPath,
} from "#features/org-admin"

import {
  canActInOrganization,
  fetchOrgWorkbenchIdentity,
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const metadata: Metadata = {
  title: "Admin",
  openGraph: { title: `Organization admin | ${SITE_NAME}` },
}

export default async function OrgAdminWorkbenchLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/admin">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const resume = toLocalePath(
    locale,
    organizationAdminPath(orgSlug, "overview")
  ) as unknown as string

  await requireRecentAuthStepUp({ returnTo: resume })
  await requireVerifiedEmailForAccount(resume)

  const orgSession = await requireOrgSession()

  // canAdmin check and identity fetch both need the org id but are
  // independent of each other — start them in parallel.
  const [canAdmin, identity] = await Promise.all([
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    fetchOrgWorkbenchIdentity(orgSession.organizationId),
  ])
  if (!canAdmin) {
    redirect(toLocalePath(locale, organizationDashboardPath(orgSlug, "home")))
  }
  if (!identity) {
    notFound()
  }

  const envelope: RouteEnvelope = {
    surface: "admin",
    locale,
    orgSlug,
    orgId: orgSession.organizationId,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>
      <OrgAdminWorkbenchShell orgSlug={orgSlug} orgName={identity.name}>
        {children}
      </OrgAdminWorkbenchShell>
    </RouteEnvelopeProvider>
  )
}
