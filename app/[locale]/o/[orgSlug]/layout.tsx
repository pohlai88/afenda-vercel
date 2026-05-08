import type { Metadata, Route } from "next"
import { notFound, redirect } from "next/navigation"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { localePrefixedOrgDashboardRedirect } from "#lib/dashboard-org-redirect.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"
import {
  getOrganizationIdBySlug,
  getOrganizationSlugById,
} from "#lib/org-slug.server"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { requireOrgSession } from "#lib/tenant"

/** Tenant ERP shell: keep org-scoped URLs out of public search indexes by default. */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]/o/[orgSlug]">, "params">): Promise<Metadata> {
  void _params
  return { robots: PRIVATE_SURFACE_ROBOTS }
}

export default async function OrgSlugLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]">) {
  const { locale: localeRaw, orgSlug: orgSlugRaw } = await params
  const locale = ensureAppLocale(localeRaw)
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    notFound()
  }

  const [resolvedOrgId, session] = await Promise.all([
    getOrganizationIdBySlug(orgSlug),
    requireOrgSession(),
  ])

  if (!resolvedOrgId) {
    notFound()
  }

  if (resolvedOrgId !== session.organizationId) {
    // Cross-tenant correction is not a permanent move — the user's active org can change.
    const canonicalSlug = await getOrganizationSlugById(session.organizationId)
    if (!canonicalSlug) {
      notFound()
    }
    const target = await localePrefixedOrgDashboardRedirect(
      locale,
      canonicalSlug
    )
    redirect(target as Route)
  }

  const envelope: RouteEnvelope = {
    surface: "org",
    locale,
    orgSlug,
    orgId: session.organizationId,
  }

  return (
    <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
  )
}
