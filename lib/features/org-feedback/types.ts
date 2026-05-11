import type { FeedbackStateId } from "./constants"

export type OrgFeedbackEventMetadata = {
  messageLength?: number
  source?: "utility-marketplace"
  requestKind?: "rail-icon"
  utilityId?: string
}

export type SubmitOrgFeedbackFieldErrors = {
  category?: "invalid"
  severity?: "invalid"
  message?: "errorMin" | "errorMax"
}

export type SubmitOrgFeedbackState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "validation"
      fieldErrors: SubmitOrgFeedbackFieldErrors
    }
  | { status: "error"; messageKey: "errorGeneric" }

/** Serializable row for admin inbox (RSC → client islands). */
export type OrgFeedbackEventSummary = {
  id: string
  createdAt: string
  actorUserId: string
  category: string
  severity: string
  message: string
  path: string | null
  state: FeedbackStateId
  metadata: OrgFeedbackEventMetadata | null
  acknowledgedByUserId: string | null
  acknowledgedAt: string | null
  resolvedByUserId: string | null
  resolvedAt: string | null
  resolutionNote: string | null
}

export type OrgFeedbackListResult = {
  items: OrgFeedbackEventSummary[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type OrgFeedbackListStateFilter = "all" | FeedbackStateId

export type TransitionOrgFeedbackState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error"
      messageKey:
        | "errorUnauthorized"
        | "errorNotFound"
        | "errorInvalidTransition"
        | "errorGeneric"
    }
  | { status: "validation"; messageKey: "errorValidation" }
