import type {
  HrmApplicationStage,
  HrmInterviewOutcome,
  HrmJobOfferStatus,
  HrmJobRequisitionStatus,
} from "../schemas/recruitment.schema"

export const REQUISITION_STATUS_TRANSITIONS = {
  draft: ["open", "cancelled"],
  open: ["filled", "cancelled"],
  filled: [],
  cancelled: [],
} as const satisfies Record<
  HrmJobRequisitionStatus,
  readonly HrmJobRequisitionStatus[]
>

export const APPLICATION_STAGE_TRANSITIONS = {
  applied: ["screening", "rejected", "withdrawn", "archived"],
  screening: ["shortlisted", "interview", "rejected", "withdrawn", "archived"],
  shortlisted: ["interview", "assessment", "rejected", "withdrawn", "archived"],
  interview: ["assessment", "offer", "rejected", "withdrawn", "archived"],
  assessment: ["offer", "rejected", "withdrawn", "archived"],
  offer: ["hired", "rejected", "withdrawn", "archived"],
  hired: ["archived"],
  rejected: ["archived"],
  withdrawn: ["archived"],
  archived: [],
} as const satisfies Record<HrmApplicationStage, readonly HrmApplicationStage[]>

export const OFFER_STATUS_TRANSITIONS = {
  draft: ["approved", "withdrawn"],
  approved: ["sent", "withdrawn"],
  sent: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
} as const satisfies Record<HrmJobOfferStatus, readonly HrmJobOfferStatus[]>

export const INTERVIEW_OUTCOME_TO_EVENT: Record<HrmInterviewOutcome, string> = {
  recommended: "interview.recommended",
  not_recommended: "interview.not_recommended",
  needs_follow_up: "interview.needs_follow_up",
  cancelled: "interview.cancelled",
}

export function canTransitionRequisitionStatus(
  from: HrmJobRequisitionStatus,
  to: HrmJobRequisitionStatus
): boolean {
  return (
    from === to ||
    (
      REQUISITION_STATUS_TRANSITIONS[from] as readonly HrmJobRequisitionStatus[]
    ).includes(to)
  )
}

export function canTransitionApplicationStage(
  from: HrmApplicationStage,
  to: HrmApplicationStage
): boolean {
  return (
    from === to ||
    (
      APPLICATION_STAGE_TRANSITIONS[from] as readonly HrmApplicationStage[]
    ).includes(to)
  )
}

export function canTransitionOfferStatus(
  from: HrmJobOfferStatus,
  to: HrmJobOfferStatus
): boolean {
  return (
    from === to ||
    (OFFER_STATUS_TRANSITIONS[from] as readonly HrmJobOfferStatus[]).includes(
      to
    )
  )
}

export type RequisitionSkillMetadata = {
  readonly skillRequirements?: readonly string[]
}

export type RequisitionSkillMatchResult = {
  readonly matchedCodes: readonly string[]
  readonly missingCodes: readonly string[]
  readonly matchRatio: number
}

/** Parse comma/semicolon/space-separated skill codes from a form field. */
export function parseRequiredSkillCodesInput(
  raw: string | null | undefined
): readonly string[] {
  if (!raw?.trim()) return []
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
}

export function readRequisitionSkillRequirements(
  audit7w1h: unknown
): readonly string[] {
  if (!audit7w1h || typeof audit7w1h !== "object") return []
  const skillRequirements = (audit7w1h as RequisitionSkillMetadata)
    .skillRequirements
  if (!Array.isArray(skillRequirements)) return []
  return skillRequirements.filter(
    (code): code is string => typeof code === "string" && code.length > 0
  )
}

/** Score candidate skill codes against a requisition requirement list (pure). */
export function scoreRequisitionSkillMatch(
  requiredSkillCodes: readonly string[],
  candidateSkillCodes: readonly string[]
): RequisitionSkillMatchResult {
  const required = [
    ...new Set(
      requiredSkillCodes.map((c) => c.trim().toLowerCase()).filter(Boolean)
    ),
  ]
  const candidate = new Set(
    candidateSkillCodes.map((c) => c.trim().toLowerCase()).filter(Boolean)
  )
  const matchedCodes = required.filter((code) => candidate.has(code))
  const missingCodes = required.filter((code) => !candidate.has(code))
  const matchRatio =
    required.length === 0 ? 1 : matchedCodes.length / required.length
  return { matchedCodes, missingCodes, matchRatio }
}

export function nextApplicationStageLabel(
  stage: HrmApplicationStage
): HrmApplicationStage | null {
  switch (stage) {
    case "applied":
      return "screening"
    case "screening":
      return "shortlisted"
    case "shortlisted":
      return "interview"
    case "interview":
      return "assessment"
    case "assessment":
      return "offer"
    case "offer":
      return "hired"
    case "hired":
    case "rejected":
    case "withdrawn":
    case "archived":
      return null
  }
}
