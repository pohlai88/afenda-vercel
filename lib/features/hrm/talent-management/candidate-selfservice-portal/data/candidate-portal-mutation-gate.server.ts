import "server-only"

import type { PublicPortalContext } from "#lib/portal/public-portal.server"

import {
  CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR,
  type CandidatePortalContext,
} from "./candidate-portal-access.shared"
import {
  getCandidatePortalContextByMagicToken,
  getPublicCandidatePortalContext,
} from "./candidate-portal-access.server"

export type CandidatePublicPortalGateSuccess = {
  readonly ok: true
  readonly portal: PublicPortalContext
}

export type CandidatePortalSessionGateSuccess = {
  readonly ok: true
  readonly context: CandidatePortalContext
}

export type CandidatePortalGateFailure = {
  readonly ok: false
  readonly formError: typeof CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR
}

export async function requireCandidatePublicPortalGate(
  portalSlug: string
): Promise<CandidatePublicPortalGateSuccess | CandidatePortalGateFailure> {
  const portal = await getPublicCandidatePortalContext(portalSlug)
  if (!portal) {
    return { ok: false, formError: CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR }
  }
  return { ok: true, portal }
}

export async function requireCandidatePortalSessionGate(input: {
  portalSlug: string
  token: string
}): Promise<CandidatePortalSessionGateSuccess | CandidatePortalGateFailure> {
  const context = await getCandidatePortalContextByMagicToken(input)
  if (!context) {
    return { ok: false, formError: CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR }
  }
  return { ok: true, context }
}
