import { z } from "zod"

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Canonical `hrm_review_cycle.state` values (product + DB contract). */
export const HRM_REVIEW_CYCLE_STATES = ["draft", "active", "closed"] as const
export type HrmReviewCycleState = (typeof HRM_REVIEW_CYCLE_STATES)[number]
export const hrmReviewCycleStateSchema = z.enum(HRM_REVIEW_CYCLE_STATES)

/** Cycle-level review workflow — drives `submitReviewAction` branching. */
export const HRM_REVIEW_PIPELINES = ["single", "three_stage"] as const
export type HrmReviewPipeline = (typeof HRM_REVIEW_PIPELINES)[number]
export const hrmReviewPipelineSchema = z.enum(HRM_REVIEW_PIPELINES)

/** Canonical `hrm_review.state` workflow values for ERP v1. */
export const HRM_REVIEW_ROW_STATES = [
  "self_pending",
  "manager_pending",
  "hr_pending",
  "submitted",
  "acknowledged",
  "closed",
  "cancelled",
] as const
export type HrmReviewRowState = (typeof HRM_REVIEW_ROW_STATES)[number]
export const hrmReviewRowStateSchema = z.enum(HRM_REVIEW_ROW_STATES)
export const reviewStageSchema = hrmReviewRowStateSchema

/** Insert default for new cycles (matches Drizzle column default). */
export const HRM_REVIEW_CYCLE_INITIAL_STATE: HrmReviewCycleState = "draft"

/** Stable object for action comparisons (avoids string drift). */
export const HRM_REVIEW_ROW_STATE = {
  selfPending: "self_pending",
  managerPending: "manager_pending",
  hrPending: "hr_pending",
  submitted: "submitted",
  acknowledged: "acknowledged",
  closed: "closed",
  cancelled: "cancelled",
} as const satisfies Record<string, HrmReviewRowState>

export function initialReviewStageForPipeline(
  pipeline: HrmReviewPipeline
): HrmReviewRowState {
  return pipeline === "three_stage"
    ? HRM_REVIEW_ROW_STATE.selfPending
    : HRM_REVIEW_ROW_STATE.managerPending
}

export function normalizeReviewStage(
  value: string | null | undefined,
  pipeline: HrmReviewPipeline
): HrmReviewRowState | null {
  if (value === "pending") {
    return initialReviewStageForPipeline(pipeline)
  }
  const parsed = hrmReviewRowStateSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function nextReviewStageAfterSubmit(input: {
  currentStage: HrmReviewRowState
  pipeline: HrmReviewPipeline
}): HrmReviewRowState | null {
  if (
    input.currentStage === HRM_REVIEW_ROW_STATE.selfPending &&
    input.pipeline === "three_stage"
  ) {
    return HRM_REVIEW_ROW_STATE.managerPending
  }
  if (input.currentStage === HRM_REVIEW_ROW_STATE.managerPending) {
    return input.pipeline === "three_stage"
      ? HRM_REVIEW_ROW_STATE.hrPending
      : HRM_REVIEW_ROW_STATE.submitted
  }
  if (
    input.currentStage === HRM_REVIEW_ROW_STATE.hrPending &&
    input.pipeline === "three_stage"
  ) {
    return HRM_REVIEW_ROW_STATE.submitted
  }
  return null
}

export const createReviewCycleFormSchema = z
  .object({
    orgSlug: z.string().min(1),
    name: z.string().min(1).max(200),
    periodStart: isoDate,
    periodEnd: isoDate,
    reviewPipeline: hrmReviewPipelineSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.periodEnd < v.periodStart) {
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Period end must be on or after period start.",
      })
    }
  })

export const reviewGenerationFormSchema = z.object({
  orgSlug: z.string().min(1),
  cycleId: uuid,
  fallbackReviewerUserId: uuid.optional(),
})

export const closeReviewCycleFormSchema = z.object({
  orgSlug: z.string().min(1),
  cycleId: uuid,
})

export const submitPerformanceReviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  reviewId: uuid,
  rating: z.string().max(64).optional(),
  notes: z.string().max(4000).optional(),
  competencyScoresJson: z.string().max(8000).optional(),
})

export const acknowledgePerformanceReviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  reviewId: uuid,
})

export const cancelReviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  reviewId: uuid,
  reason: z.string().max(1000).optional(),
})

export type CreateReviewCycleFormInput = z.infer<
  typeof createReviewCycleFormSchema
>
export type ReviewGenerationFormInput = z.infer<
  typeof reviewGenerationFormSchema
>
export type CloseReviewCycleFormInput = z.infer<
  typeof closeReviewCycleFormSchema
>
export type SubmitPerformanceReviewFormInput = z.infer<
  typeof submitPerformanceReviewFormSchema
>
export type AcknowledgePerformanceReviewFormInput = z.infer<
  typeof acknowledgePerformanceReviewFormSchema
>
export type CancelReviewFormInput = z.infer<typeof cancelReviewFormSchema>
