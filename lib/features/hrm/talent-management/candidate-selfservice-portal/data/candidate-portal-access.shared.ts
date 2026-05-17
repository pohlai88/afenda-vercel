import type { PublicPortalContext } from "#lib/portal/public-portal.server"

export const CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR =
  "Candidate portal access is unavailable."

export type CandidatePortalSubjectRow = {
  id: string
  legalName: string
  email: string | null
  magicLinkToken: string | null
  magicLinkExpiresAt: Date | null
  archivedAt: Date | null
}

export type CandidatePortalContext = {
  portal: PublicPortalContext
  candidate: CandidatePortalSubjectRow
  applicationId: string
}

export type CandidatePortalMutationGateSuccess = {
  readonly ok: true
  readonly context: CandidatePortalContext
}

export type CandidatePortalMutationGateFailure = {
  readonly ok: false
  readonly formError: typeof CANDIDATE_PORTAL_ACCESS_UNAVAILABLE_ERROR
}

export type CandidatePortalMutationGateResult =
  | CandidatePortalMutationGateSuccess
  | CandidatePortalMutationGateFailure
