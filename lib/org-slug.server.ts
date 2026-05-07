import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { organization } from "#lib/db/schema"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

export async function getOrganizationSlugById(
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
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
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, normalized))
    .limit(1)
  return row?.id ?? null
}
