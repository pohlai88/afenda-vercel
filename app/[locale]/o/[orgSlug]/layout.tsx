import type { Metadata, Route } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { NexusShell } from "#components/nexus/nexus-shell"
import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { localePrefixedOrgDashboardRedirect } from "#lib/dashboard-org-redirect.server"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"
import {
  getOrganizationIdBySlug,
  getOrganizationNameById,
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
    // Cross-tenant correction — the URL org slug doesn't match the session's active org.
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

  // Fetch org name in parallel with translation loading.
  // Falls back to orgSlug if the org row is missing a name (shouldn't happen in practice).
  const [orgName, tShell] = await Promise.all([
    getOrganizationNameById(session.organizationId),
    getTranslations("Dashboard.shell"),
  ])

  const envelope: RouteEnvelope = {
    surface: "org",
    locale,
    orgSlug,
    orgId: session.organizationId,
  }

  // Nexus runtime mounts here so L1 utility bar, command palette, Lynx summon,
  // and future dock slot all persist across surfaces — Spatial OS continuity.
  // Nexus field content lives under `nexus/page.tsx` (`/o/{slug}/nexus`).
  // See AGENTS.md §5 → Nexus runtime (org root).
  return (
    <RouteEnvelopeProvider value={envelope}>
      <NexusShell
        skipToMainLabel={tShell("skipToMain")}
        orgSlug={orgSlug}
        orgName={orgName ?? orgSlug}
        orgId={session.organizationId}
        userId={session.userId}
        userEmail={session.user.email}
      >
        {children}
      </NexusShell>
    </RouteEnvelopeProvider>
  )
}
