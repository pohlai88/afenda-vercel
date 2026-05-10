import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NexusField } from "#components/nexus/nexus-field"
import { getNexusSnapshot } from "#features/nexus/server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"
import { requireOrgSession } from "#lib/tenant"

/**
 * **Nexus field** — operational origin at `/[locale]/o/[orgSlug]/nexus`.
 *
 * Org URL root (`/o/[orgSlug]`) redirects here so bookmarks and `/o` resolver
 * land on the same surface.
 *
 * Authority + chrome: `[orgSlug]/layout.tsx` (`NexusShell`).
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

  return <NexusField snapshot={snapshot} />
}
