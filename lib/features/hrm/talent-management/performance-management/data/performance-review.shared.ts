import type {
  HrmReviewPipeline,
  HrmReviewRowState,
} from "../schemas/performance.schema"
import {
  HRM_REVIEW_ROW_STATE,
  nextReviewStageAfterSubmit,
} from "../schemas/performance.schema"

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
