"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"

import {
  submitAcknowledgePerformanceReview,
  submitCancelPerformanceReview,
  submitPerformanceReview,
} from "../actions/performance.actions"
import type { HrmPerformanceReviewListRow } from "../data/performance.queries.server"
import {
  canAcknowledgeReviewStage,
  canCancelReviewRowStage,
  canSubmitReviewStageTransition,
  performanceReviewRowHasTrailingUi,
} from "../data/performance-review.shared"
import { HRM_REVIEW_ROW_STATE } from "../schemas/performance.schema"

export type PerformanceReviewRowActionsProps = {
  orgSlug: string
  review: HrmPerformanceReviewListRow
  viewerUserId: string
  canUpdate: boolean
}

export function PerformanceReviewRowActions({
  orgSlug,
  review,
  viewerUserId,
  canUpdate,
}: PerformanceReviewRowActionsProps) {
  const t = useTranslations("Dashboard.Hrm.performance")

  if (
    !performanceReviewRowHasTrailingUi(review, { canUpdate, viewerUserId })
  ) {
    return null
  }

  const showSubmit =
    review.cycleState === "active" &&
    canSubmitReviewStageTransition({
      currentStage: review.state,
      pipeline: review.reviewPipeline,
    }) &&
    (canUpdate ||
      (review.state === HRM_REVIEW_ROW_STATE.selfPending &&
        review.employeeLinkedUserId === viewerUserId) ||
      (review.state === HRM_REVIEW_ROW_STATE.managerPending &&
        review.reviewerId === viewerUserId))

  const showAcknowledge =
    review.cycleState === "active" &&
    canAcknowledgeReviewStage(review.state) &&
    (canUpdate || review.employeeLinkedUserId === viewerUserId)

  const showCancel =
    review.cycleState === "active" &&
    canCancelReviewRowStage(review.state) &&
    canUpdate

  return (
    <div className="inline-flex flex-col items-end gap-2">
      {showSubmit ? (
        <form
          action={submitPerformanceReview}
          className="grid min-w-56 gap-2 text-left"
        >
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="reviewId" value={review.reviewId} />
          <Input
            name="rating"
            placeholder={t("ratingPlaceholder")}
            className="h-8"
          />
          <Input
            name="notes"
            placeholder={t("notesPlaceholder")}
            className="h-8"
          />
          <Input
            name="competencyScoresJson"
            placeholder={t("competencyScoresPlaceholder")}
            className="h-8"
          />
          <Button type="submit" size="sm" variant="secondary">
            {t("submitReview")}
          </Button>
        </form>
      ) : null}
      {showAcknowledge ? (
        <form
          action={submitAcknowledgePerformanceReview}
          className="inline-flex"
        >
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="reviewId" value={review.reviewId} />
          <Button type="submit" size="sm" variant="outline">
            {t("acknowledgeReview")}
          </Button>
        </form>
      ) : null}
      {showCancel ? (
        <form action={submitCancelPerformanceReview} className="inline-flex">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="reviewId" value={review.reviewId} />
          <Button type="submit" size="sm" variant="ghost">
            {t("cancelReview")}
          </Button>
        </form>
      ) : null}
    </div>
  )
}

