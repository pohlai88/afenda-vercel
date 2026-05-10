import { z } from "zod"

import { FEEDBACK_RESOLUTION_NOTE_MAX, type FeedbackStateId } from "../constants"

const emptyToNull = (v: unknown) => {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s
}

export const feedbackTransitionFormSchema = z.object({
  id: z.string().trim().min(1).max(128),
  transition: z.enum(["acknowledge", "resolve", "reject"]),
  resolutionNote: z.preprocess(
    emptyToNull,
    z.string().max(FEEDBACK_RESOLUTION_NOTE_MAX).nullable()
  ),
})

export type FeedbackTransitionFormInput = z.infer<
  typeof feedbackTransitionFormSchema
>

/** Allowed target `state` values after a transition (for tests / guards). */
export const FEEDBACK_TRANSITION_TO_STATE = {
  acknowledge: "acknowledged",
  resolve: "resolved",
  reject: "rejected",
} as const satisfies Record<
  FeedbackTransitionFormInput["transition"],
  FeedbackStateId
>
