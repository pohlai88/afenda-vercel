import "server-only"

import { cache } from "react"
import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { organizationPortal } from "#lib/db/schema"
import { neonAuthOrganization } from "#lib/db/schema-neon-auth"

import {
  portalAudienceSchema,
  portalStatusSchema,
  type PortalAudience,
} from "./constants"
import { normalizePortalSlugParam } from "./slug.shared"

export type PublicPortalContext = {
  portalId: string
  portalSlug: string
  portalAudience: PortalAudience
  portalDisplayName: string
  organizationId: string
  organizationName: string
}

export const getPublicPortalBySlug = cache(async function getPublicPortalBySlug(
  rawPortalSlug: string,
  expectedAudience: PortalAudience
): Promise<PublicPortalContext | null> {
  const portalSlug = normalizePortalSlugParam(rawPortalSlug)
  if (!portalSlug) {
    return null
  }

  const [portal] = await db
    .select({
      id: organizationPortal.id,
      slug: organizationPortal.slug,
      audience: organizationPortal.audience,
      status: organizationPortal.status,
      displayName: organizationPortal.displayName,
      organizationId: organizationPortal.organizationId,
      organizationName: neonAuthOrganization.name,
    })
    .from(organizationPortal)
    .innerJoin(
      neonAuthOrganization,
      eq(neonAuthOrganization.id, organizationPortal.organizationId)
    )
    .where(eq(organizationPortal.slug, portalSlug))
    .limit(1)

  if (!portal) {
    return null
  }

  const audience = portalAudienceSchema.safeParse(portal.audience)
  if (!audience.success || audience.data !== expectedAudience) {
    return null
  }

  const status = portalStatusSchema.safeParse(portal.status)
  if (!status.success || status.data !== "active") {
    return null
  }

  return {
    portalId: portal.id,
    portalSlug: portal.slug,
    portalAudience: audience.data,
    portalDisplayName: portal.displayName,
    organizationId: portal.organizationId,
    organizationName: portal.organizationName,
  }
})

export async function requirePublicCandidatePortal(
  rawPortalSlug: string
): Promise<PublicPortalContext> {
  const context = await getPublicPortalBySlug(rawPortalSlug, "candidate")
  if (!context) {
    notFound()
  }
  return context
}
