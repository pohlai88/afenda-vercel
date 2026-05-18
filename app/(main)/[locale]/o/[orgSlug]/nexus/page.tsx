import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NexusPage } from "#components2/nexus/nexus-page"
import { getNexusSnapshot } from "#features/nexus/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"
import { getOrgTenantContext } from "#lib/auth"

/**
 * **Nexus field** — operational origin at `/[locale]/o/[orgSlug]/nexus`.
 *
 * Org URL root (`/o/[orgSlug]`) redirects here so bookmarks and `/o` resolver
 * land on the same surface.
 *
 * Authority + chrome: `[orgSlug]/layout.tsx` (`AppShell`).
 */
export const metadata: Metadata = {
  title: "Nexus",
  robots: PRIVATE_SURFACE_ROBOTS,
}

export default async function OrgNexusPage({
  params,
}: PageProps<"/[locale]/o/[orgSlug]/nexus">) {
  const { locale: localeRaw, orgSlug: orgSlugRaw } = await params
  bindRequestLocale(localeRaw)
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    notFound()
  }

  const session = await getOrgTenantContext()
  const snapshot = await getNexusSnapshot({ session, orgSlug })

  return <NexusPage snapshot={snapshot} />
}
