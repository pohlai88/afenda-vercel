import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthOrganization } from "#lib/db/schema-neon-auth"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

export async function getOrganizationSlugById(
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ slug: neonAuthOrganization.slug })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.id, organizationId))
    .limit(1)
  return row?.slug ?? null
}

export async function getOrganizationIdBySlug(
  slug: string
): Promise<string | null> {
  const normalized = normalizeOrgSlugParam(slug)
  if (!normalized) {
    return null
  }
  const [row] = await db
    .select({ id: neonAuthOrganization.id })
    .from(neonAuthOrganization)
    .where(eq(neonAuthOrganization.slug, normalized))
    .limit(1)
  return row?.id ?? null
}
