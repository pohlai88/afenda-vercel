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
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
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

export function nextApplicationStageLabel(
  stage: HrmApplicationStage
): HrmApplicationStage | null {
  switch (stage) {
    case "applied":
      return "screening"
    case "screening":
      return "interview"
    case "interview":
      return "offer"
    case "offer":
      return "hired"
    case "hired":
    case "rejected":
      return null
  }
}
