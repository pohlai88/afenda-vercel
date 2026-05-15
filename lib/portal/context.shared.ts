import type { SignedInSession } from "#lib/tenant"

import {
  portalAccessStatusSchema,
  portalAudienceSchema,
  portalStatusSchema,
} from "./constants"
import type { PortalAudience } from "./constants"

export type PortalContext = {
  portalId: string
  portalSlug: string
  portalAudience: PortalAudience
  portalDisplayName: string
  organizationId: string
  organizationName: string
  userId: string
  sessionId: string
  user: SignedInSession["user"]
  subjectId: string | null
}

export type PortalResolverPortalRow = {
  id: string
  slug: string
  audience: string
  status: string
  displayName: string
  organizationId: string
  organizationName: string
}

export type PortalResolverAccessRow = {
  id: string
  audience: string
  status: string
  organizationId: string
  subjectId: string | null
}

export type PortalContextResolution =
  | { ok: true; context: PortalContext }
  | {
      ok: false
      reason:
        | "portal_not_found"
        | "portal_audience_invalid"
        | "portal_inactive"
        | "access_not_found"
        | "access_audience_invalid"
        | "access_inactive"
        | "access_audience_mismatch"
        | "access_org_mismatch"
    }

export function resolvePortalContextFromRows(input: {
  session: SignedInSession
  portal: PortalResolverPortalRow | null
  access: PortalResolverAccessRow | null
}): PortalContextResolution {
  const { session, portal, access } = input

  if (!portal) return { ok: false, reason: "portal_not_found" }

  const portalAudience = portalAudienceSchema.safeParse(portal.audience)
  if (!portalAudience.success) {
    return { ok: false, reason: "portal_audience_invalid" }
  }

  const portalStatus = portalStatusSchema.safeParse(portal.status)
  if (!portalStatus.success || portalStatus.data !== "active") {
    return { ok: false, reason: "portal_inactive" }
  }

  if (!access) return { ok: false, reason: "access_not_found" }

  const accessAudience = portalAudienceSchema.safeParse(access.audience)
  if (!accessAudience.success) {
    return { ok: false, reason: "access_audience_invalid" }
  }

  const accessStatus = portalAccessStatusSchema.safeParse(access.status)
  if (!accessStatus.success || accessStatus.data !== "active") {
    return { ok: false, reason: "access_inactive" }
  }

  if (accessAudience.data !== portalAudience.data) {
    return { ok: false, reason: "access_audience_mismatch" }
  }

  if (access.organizationId !== portal.organizationId) {
    return { ok: false, reason: "access_org_mismatch" }
  }

  return {
    ok: true,
    context: {
      portalId: portal.id,
      portalSlug: portal.slug,
      portalAudience: portalAudience.data,
      portalDisplayName: portal.displayName,
      organizationId: portal.organizationId,
      organizationName: portal.organizationName,
      userId: session.userId,
      sessionId: session.sessionId,
      user: session.user,
      subjectId: access.subjectId,
    },
  }
}
