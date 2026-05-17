import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NexusPage } from "#components2/nexus/nexus-page"
import { getNexusSnapshot } from "#features/nexus/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"
import { requireOrgSession } from "#lib/auth"

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
  const { orgSlug: orgSlugRaw } = await params
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    notFound()
  }

  const session = await requireOrgSession()
  const snapshot = await getNexusSnapshot({ session, orgSlug })

  return <NexusPage snapshot={snapshot} />
}
