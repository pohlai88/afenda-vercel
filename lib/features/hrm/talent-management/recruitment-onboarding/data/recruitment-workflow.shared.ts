import type {
  HrmApplicationStage,
  HrmPreEmploymentCheckStatus,
  HrmInterviewOutcome,
  HrmJobOfferStatus,
  HrmJobRequisitionStatus,
  HrmScorecardRecommendation,
  HrmScreeningOutcome,
} from "../schemas/recruitment.schema"

export const REQUISITION_STATUS_TRANSITIONS = {
  draft: ["pending_approval", "approved", "open", "cancelled"],
  pending_approval: ["approved", "cancelled"],
  approved: ["open", "cancelled"],
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
  draft: ["pending_approval", "approved", "withdrawn"],
  pending_approval: ["approved", "withdrawn"],
  approved: ["sent", "withdrawn"],
  sent: ["accepted", "declined", "withdrawn", "expired"],
  accepted: [],
  declined: [],
  withdrawn: [],
  expired: [],
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

export function canPublishRequisition(input: {
  status: HrmJobRequisitionStatus
  approvalState: "not_required" | "pending" | "approved" | "rejected"
}): boolean {
  if (input.approvalState === "pending" || input.approvalState === "rejected") {
    return false
  }
  return input.status === "draft" || input.status === "approved"
}

export type ScreeningQuestionPolicy = {
  readonly id: string
  readonly isKnockout: boolean
  readonly expectedAnswer?: string | null
}

export type ScreeningAnswer = {
  readonly questionId: string
  readonly answer?: string | null
}

export type ScreeningEvaluation = {
  readonly outcome: HrmScreeningOutcome
  readonly failedKnockoutQuestionIds: readonly string[]
}

export function evaluateScreeningAnswers(
  questions: readonly ScreeningQuestionPolicy[],
  answers: readonly ScreeningAnswer[]
): ScreeningEvaluation {
  const answersByQuestionId = new Map(
    answers.map((answer) => [
      answer.questionId,
      answer.answer?.trim().toLowerCase() ?? "",
    ])
  )
  const failedKnockoutQuestionIds = questions
    .filter((question) => {
      if (!question.isKnockout || !question.expectedAnswer?.trim()) {
        return false
      }
      const expected = question.expectedAnswer.trim().toLowerCase()
      return answersByQuestionId.get(question.id) !== expected
    })
    .map((question) => question.id)

  return {
    outcome: failedKnockoutQuestionIds.length > 0 ? "failed" : "manual_review",
    failedKnockoutQuestionIds,
  }
}

export type InterviewScorecardSummary = {
  readonly recommendation: HrmScorecardRecommendation
  readonly averageRating: number | null
  readonly scorecardCount: number
}

const SCORECARD_RECOMMENDATION_WEIGHT: Record<
  HrmScorecardRecommendation,
  number
> = {
  strong_yes: 2,
  yes: 1,
  hold: 0,
  no: -1,
  strong_no: -2,
}

export function summarizeInterviewScorecards(
  scorecards: readonly {
    readonly recommendation: HrmScorecardRecommendation
    readonly overallRating?: number | null
  }[]
): InterviewScorecardSummary {
  if (scorecards.length === 0) {
    return {
      recommendation: "hold",
      averageRating: null,
      scorecardCount: 0,
    }
  }
  const ratingValues = scorecards
    .map((scorecard) => scorecard.overallRating)
    .filter((rating): rating is number => typeof rating === "number")
  const averageRating =
    ratingValues.length === 0
      ? null
      : ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length
  const recommendationScore =
    scorecards.reduce(
      (sum, scorecard) =>
        sum + SCORECARD_RECOMMENDATION_WEIGHT[scorecard.recommendation],
      0
    ) / scorecards.length

  const recommendation: HrmScorecardRecommendation =
    recommendationScore >= 1.5
      ? "strong_yes"
      : recommendationScore >= 0.5
        ? "yes"
        : recommendationScore <= -1.5
          ? "strong_no"
          : recommendationScore <= -0.5
            ? "no"
            : "hold"

  return {
    recommendation,
    averageRating,
    scorecardCount: scorecards.length,
  }
}

export function preEmploymentChecksReadyForHire(
  statuses: readonly HrmPreEmploymentCheckStatus[]
): boolean {
  return statuses.every((status) => status === "passed" || status === "waived")
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
