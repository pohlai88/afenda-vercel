import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApplication, hrmCandidate } from "#lib/db/schema"
import { getPublicPortalBySlug } from "#lib/portal/public-portal.server"

import type { CandidatePortalContext } from "./candidate-portal-access.shared"

export async function getCandidatePortalContextByMagicToken(input: {
  portalSlug: string
  token: string
}): Promise<CandidatePortalContext | null> {
  const portal = await getPublicPortalBySlug(input.portalSlug, "candidate")
  if (!portal) {
    return null
  }
  const token = input.token.trim()
  if (!token) {
    return null
  }

  const [candidate] = await db
    .select({
      id: hrmCandidate.id,
      legalName: hrmCandidate.legalName,
      email: hrmCandidate.email,
      magicLinkToken: hrmCandidate.magicLinkToken,
      magicLinkExpiresAt: hrmCandidate.magicLinkExpiresAt,
      archivedAt: hrmCandidate.archivedAt,
    })
    .from(hrmCandidate)
    .where(
      and(
        eq(hrmCandidate.organizationId, portal.organizationId),
        eq(hrmCandidate.magicLinkToken, token),
        isNull(hrmCandidate.archivedAt)
      )
    )
    .limit(1)

  if (!candidate) {
    return null
  }

  if (
    candidate.magicLinkExpiresAt &&
    candidate.magicLinkExpiresAt.getTime() <= Date.now()
  ) {
    return null
  }

  const [application] = await db
    .select({ id: hrmApplication.id })
    .from(hrmApplication)
    .where(
      and(
        eq(hrmApplication.organizationId, portal.organizationId),
        eq(hrmApplication.candidateId, candidate.id)
      )
    )
    .orderBy(desc(hrmApplication.createdAt))
    .limit(1)

  if (!application) {
    return null
  }

  return {
    portal,
    candidate,
    applicationId: application.id,
  }
}

export async function getPublicCandidatePortalContext(portalSlug: string) {
  return getPublicPortalBySlug(portalSlug, "candidate")
}

export async function listOpenRequisitionsForPublicCareers(
  organizationId: string
) {
  const { listOpenJobRequisitionsForOrganization } = await import(
    "../../recruitment-applicant-tracking/data/recruitment.queries.server"
  )
  return listOpenJobRequisitionsForOrganization(organizationId)
}
