import type { Route } from "next"
import { notFound, redirect } from "next/navigation"

import { organizationNexusPath } from "#features/nexus"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * Org URL root — redirects to the Nexus field (`/o/{slug}/nexus`).
 */
export default async function OrgSlugRootRedirect({
  params,
}: PageProps<"/[locale]/o/[orgSlug]">) {
  const { orgSlug: orgSlugRaw } = await params
  const orgSlug = normalizeOrgSlugParam(orgSlugRaw)
  if (!orgSlug) {
    notFound()
  }
  redirect(organizationNexusPath(orgSlug) as Route)
}
