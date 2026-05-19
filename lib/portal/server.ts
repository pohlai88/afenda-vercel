import "server-only"

import { cache } from "react"
import { notFound } from "next/navigation"
import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { organizationPortal, organizationPortalAccess } from "#lib/db/schema"
import { neonAuthOrganization } from "#lib/db/schema-neon-auth"
import { requireSignedInSession } from "#lib/auth"

import {
  resolvePortalContextFromRows,
  type PortalContext,
} from "./context.shared"
import { normalizePortalSlugParam } from "./slug.shared"

export const getPortalContext = cache(async function getPortalContext(
  rawPortalSlug: string
): Promise<PortalContext | null> {
  const session = await requireSignedInSession()
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
      // neon_auth.organization.id is uuid (platform-owned); organization_portal.organizationId
      // is text. Postgres has no implicit cast between text and uuid for column-to-column
      // comparisons, so cast the app column explicitly to keep the single round-trip join.
      sql`${neonAuthOrganization.id} = ${organizationPortal.organizationId}::uuid`
    )
    .where(eq(organizationPortal.slug, portalSlug))
    .limit(1)

  const [access] = portal
    ? await db
        .select({
          id: organizationPortalAccess.id,
          audience: organizationPortalAccess.audience,
          status: organizationPortalAccess.status,
          organizationId: organizationPortalAccess.organizationId,
          subjectId: organizationPortalAccess.subjectId,
        })
        .from(organizationPortalAccess)
        .where(
          and(
            eq(organizationPortalAccess.portalId, portal.id),
            eq(organizationPortalAccess.userId, session.userId)
          )
        )
        .limit(1)
    : [undefined]

  const resolution = resolvePortalContextFromRows({
    session,
    portal: portal ?? null,
    access: access ?? null,
  })

  return resolution.ok ? resolution.context : null
})

export const requirePortalContext = cache(async function requirePortalContext(
  rawPortalSlug: string
): Promise<PortalContext> {
  const context = await getPortalContext(rawPortalSlug)

  if (!context) {
    notFound()
  }

  return context
})
