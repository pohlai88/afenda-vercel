import { z } from "zod"

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SEVERITIES,
} from "../constants"

const emptyToUndef = (v: unknown) =>
  v === "" || v == null ? undefined : String(v)

export const feedbackSubmissionSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  severity: z.enum(FEEDBACK_SEVERITIES),
  message: z
    .string()
    .trim()
    .min(FEEDBACK_MESSAGE_MIN)
    .max(FEEDBACK_MESSAGE_MAX),
  path: z.preprocess(emptyToUndef, z.string().max(512).optional()),
  userAgent: z.preprocess(emptyToUndef, z.string().max(512).optional()),
})

export type FeedbackSubmissionInput = z.infer<typeof feedbackSubmissionSchema>