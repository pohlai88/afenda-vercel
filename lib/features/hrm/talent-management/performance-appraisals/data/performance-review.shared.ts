import type {
  HrmReviewPipeline,
  HrmReviewRowState,
} from "../schemas/performance.schema"
import {
  HRM_REVIEW_ROW_STATE,
  nextReviewStageAfterSubmit,
} from "../schemas/performance.schema"

import type { HrmPerformanceReviewListRow } from "./performance.queries.server"

/**
 * Pure guards for performance review row transitions (ERP v1).
 * Server Actions in `performance.actions.ts` own DB + IAM; this module is
 * the regression surface for the state machine only.
 */
export function canSubmitReviewStageTransition(input: {
  readonly currentStage: HrmReviewRowState
  readonly pipeline: HrmReviewPipeline
}): boolean {
  return nextReviewStageAfterSubmit(input) !== null
}

export function canAcknowledgeReviewStage(stage: HrmReviewRowState): boolean {
  return stage === HRM_REVIEW_ROW_STATE.submitted
}

export function isFinalReviewRowState(stage: HrmReviewRowState): boolean {
  return (
    stage === HRM_REVIEW_ROW_STATE.closed ||
    stage === HRM_REVIEW_ROW_STATE.cancelled
  )
}

export function canCancelReviewRowStage(stage: HrmReviewRowState): boolean {
  return !isFinalReviewRowState(stage)
}

/** Whether the reviews table should show a trailing action cell for this row. */
export function performanceReviewRowHasTrailingUi(
  review: Pick<
    HrmPerformanceReviewListRow,
    | "cycleState"
    | "state"
    | "reviewPipeline"
    | "employeeLinkedUserId"
    | "reviewerId"
  >,
  context: { canUpdate: boolean; viewerUserId: string }
): boolean {
  const showSubmit =
    review.cycleState === "active" &&
    canSubmitReviewStageTransition({
      currentStage: review.state,
      pipeline: review.reviewPipeline,
    }) &&
    (context.canUpdate ||
      (review.state === HRM_REVIEW_ROW_STATE.selfPending &&
        review.employeeLinkedUserId === context.viewerUserId) ||
      (review.state === HRM_REVIEW_ROW_STATE.managerPending &&
        review.reviewerId === context.viewerUserId))

  const showAcknowledge =
    review.cycleState === "active" &&
    canAcknowledgeReviewStage(review.state) &&
    (context.canUpdate || review.employeeLinkedUserId === context.viewerUserId)

  const showCancel =
    review.cycleState === "active" &&
    canCancelReviewRowStage(review.state) &&
    context.canUpdate

  return showSubmit || showAcknowledge || showCancel
}
