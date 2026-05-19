import "server-only"

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NexusFieldView } from "#components2/nexus/nexus-field-view"
import { getOrgTenantContext } from "#lib/auth"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"
import { bindRequestLocale } from "#lib/i18n/bind-request-locale.server"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

import { buildNexusFieldListSurfaces } from "../data/nexus-field-list-surfaces.server"
import { getNexusSnapshot } from "../data/nexus-snapshot.queries.server"

export function generateNexusFieldMetadata(): Metadata {
  return {
    title: "Nexus",
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

/**
 * Nexus field — operational origin at `/[locale]/o/[orgSlug]/nexus`.
 * Layer 2 orchestrator: one snapshot, governed list builders, Layer 3 view.
 */
export default async function NexusFieldPage({
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
  const listSurfaces = buildNexusFieldListSurfaces(snapshot)

  return <NexusFieldView snapshot={snapshot} listSurfaces={listSurfaces} />
}
