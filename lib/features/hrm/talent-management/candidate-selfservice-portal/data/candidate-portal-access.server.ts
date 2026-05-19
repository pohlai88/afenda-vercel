import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApplication, hrmCandidate } from "#lib/db/schema"
import { getPublicPortalBySlug } from "#lib/portal/public-portal.server"

import type { CandidatePortalContext } from "./candidate-portal-access.shared"

function readApplicationTokenExpiry(audit7w1h: unknown): Date | null {
  if (!audit7w1h || typeof audit7w1h !== "object" || Array.isArray(audit7w1h)) {
    return null
  }
  const root = audit7w1h as Record<string, unknown>
  const raw =
    root.candidatePortalTokenExpiresAt ??
    (root.candidatePortal &&
    typeof root.candidatePortal === "object" &&
    !Array.isArray(root.candidatePortal)
      ? (root.candidatePortal as Record<string, unknown>).expiresAt
      : null)
  if (typeof raw !== "string" || !raw.trim()) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

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

  const [row] = await db
    .select({
      applicationId: hrmApplication.id,
      audit7w1h: hrmApplication.audit7w1h,
      candidateId: hrmCandidate.id,
      legalName: hrmCandidate.legalName,
      email: hrmCandidate.email,
      archivedAt: hrmCandidate.archivedAt,
    })
    .from(hrmApplication)
    .innerJoin(hrmCandidate, eq(hrmCandidate.id, hrmApplication.candidateId))
    .where(
      and(
        eq(hrmApplication.organizationId, portal.organizationId),
        eq(hrmApplication.id, token),
        isNull(hrmCandidate.archivedAt)
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  const magicLinkExpiresAt = readApplicationTokenExpiry(row.audit7w1h)
  if (magicLinkExpiresAt && magicLinkExpiresAt.getTime() <= Date.now()) {
    return null
  }

  return {
    portal,
    candidate: {
      id: row.candidateId,
      legalName: row.legalName,
      email: row.email,
      magicLinkToken: token,
      magicLinkExpiresAt,
      archivedAt: row.archivedAt,
    },
    applicationId: row.applicationId,
  }
}

export async function getPublicCandidatePortalContext(portalSlug: string) {
  return getPublicPortalBySlug(portalSlug, "candidate")
}

export async function listOpenRequisitionsForPublicCareers(
  organizationId: string
) {
  const { listOpenJobRequisitionsForOrganization } =
    await import("../../recruitment-onboarding/data/recruitment.queries.server")
  return listOpenJobRequisitionsForOrganization(organizationId)
}
