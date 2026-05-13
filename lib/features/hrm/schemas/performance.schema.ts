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

/** Canonical `hrm_review.state` workflow values. */
export const HRM_REVIEW_ROW_STATES = [
  "pending",
  "submitted",
  "acknowledged",
] as const
export type HrmReviewRowState = (typeof HRM_REVIEW_ROW_STATES)[number]
export const hrmReviewRowStateSchema = z.enum(HRM_REVIEW_ROW_STATES)

/** Insert default for new cycles (matches Drizzle column default). */
export const HRM_REVIEW_CYCLE_INITIAL_STATE: HrmReviewCycleState = "draft"

/** Stable object for action comparisons (avoids string drift). */
export const HRM_REVIEW_ROW_STATE = {
  pending: "pending",
  submitted: "submitted",
  acknowledged: "acknowledged",
} as const satisfies Record<string, HrmReviewRowState>

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

export const submitPerformanceReviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  reviewId: uuid,
  rating: z.string().max(64).optional(),
  notes: z.string().max(4000).optional(),
})

export const acknowledgePerformanceReviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  reviewId: uuid,
})

export type CreateReviewCycleFormInput = z.infer<
  typeof createReviewCycleFormSchema
>
export type SubmitPerformanceReviewFormInput = z.infer<
  typeof submitPerformanceReviewFormSchema
>
export type AcknowledgePerformanceReviewFormInput = z.infer<
  typeof acknowledgePerformanceReviewFormSchema
>
