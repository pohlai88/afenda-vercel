import { describe, expect, it } from "vitest"

import {
  canAcknowledgeReviewStage,
  canCancelReviewRowStage,
  canSubmitReviewStageTransition,
  isFinalReviewRowState,
} from "../../lib/features/hrm/data/performance-review.shared"
import {
  HRM_REVIEW_ROW_STATE,
  initialReviewStageForPipeline,
  nextReviewStageAfterSubmit,
  normalizeReviewStage,
} from "../../lib/features/hrm/schemas/performance.schema"

describe("performance review stage machine", () => {
  it("initialReviewStageForPipeline", () => {
    expect(initialReviewStageForPipeline("single")).toBe(
      HRM_REVIEW_ROW_STATE.managerPending
    )
    expect(initialReviewStageForPipeline("three_stage")).toBe(
      HRM_REVIEW_ROW_STATE.selfPending
    )
  })

  it("normalizeReviewStage maps legacy pending", () => {
    expect(normalizeReviewStage("pending", "single")).toBe(
      HRM_REVIEW_ROW_STATE.managerPending
    )
    expect(normalizeReviewStage("pending", "three_stage")).toBe(
      HRM_REVIEW_ROW_STATE.selfPending
    )
  })

  it("nextReviewStageAfterSubmit — single pipeline", () => {
    expect(
      nextReviewStageAfterSubmit({
        currentStage: HRM_REVIEW_ROW_STATE.managerPending,
        pipeline: "single",
      })
    ).toBe(HRM_REVIEW_ROW_STATE.submitted)
    expect(
      nextReviewStageAfterSubmit({
        currentStage: HRM_REVIEW_ROW_STATE.submitted,
        pipeline: "single",
      })
    ).toBeNull()
  })

  it("nextReviewStageAfterSubmit — three_stage pipeline", () => {
    expect(
      nextReviewStageAfterSubmit({
        currentStage: HRM_REVIEW_ROW_STATE.selfPending,
        pipeline: "three_stage",
      })
    ).toBe(HRM_REVIEW_ROW_STATE.managerPending)
    expect(
      nextReviewStageAfterSubmit({
        currentStage: HRM_REVIEW_ROW_STATE.managerPending,
        pipeline: "three_stage",
      })
    ).toBe(HRM_REVIEW_ROW_STATE.hrPending)
    expect(
      nextReviewStageAfterSubmit({
        currentStage: HRM_REVIEW_ROW_STATE.hrPending,
        pipeline: "three_stage",
      })
    ).toBe(HRM_REVIEW_ROW_STATE.submitted)
  })

  it("canSubmitReviewStageTransition mirrors nextReviewStageAfterSubmit", () => {
    expect(
      canSubmitReviewStageTransition({
        currentStage: HRM_REVIEW_ROW_STATE.managerPending,
        pipeline: "single",
      })
    ).toBe(true)
    expect(
      canSubmitReviewStageTransition({
        currentStage: HRM_REVIEW_ROW_STATE.submitted,
        pipeline: "single",
      })
    ).toBe(false)
  })

  it("canAcknowledgeReviewStage only on submitted", () => {
    expect(canAcknowledgeReviewStage(HRM_REVIEW_ROW_STATE.submitted)).toBe(true)
    expect(canAcknowledgeReviewStage(HRM_REVIEW_ROW_STATE.managerPending)).toBe(
      false
    )
  })

  it("isFinalReviewRowState and canCancelReviewRowStage", () => {
    expect(isFinalReviewRowState(HRM_REVIEW_ROW_STATE.closed)).toBe(true)
    expect(isFinalReviewRowState(HRM_REVIEW_ROW_STATE.cancelled)).toBe(true)
    expect(canCancelReviewRowStage(HRM_REVIEW_ROW_STATE.managerPending)).toBe(
      true
    )
    expect(canCancelReviewRowStage(HRM_REVIEW_ROW_STATE.closed)).toBe(false)
  })
})
