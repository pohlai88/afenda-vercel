import { z } from "zod"

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  FEEDBACK_SEVERITIES,
} from "../constants"

const emptyToUndef = (v: unknown) =>
  v === "" || v == null ? undefined : String(v)

const FEEDBACK_REQUEST_SOURCES = ["utility-marketplace"] as const
const FEEDBACK_REQUEST_KINDS = ["rail-icon"] as const

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
  source: z.preprocess(
    emptyToUndef,
    z.enum(FEEDBACK_REQUEST_SOURCES).optional()
  ),
  requestKind: z.preprocess(
    emptyToUndef,
    z.enum(FEEDBACK_REQUEST_KINDS).optional()
  ),
  utilityId: z.preprocess(emptyToUndef, z.string().max(128).optional()),
})

export type FeedbackSubmissionInput = z.infer<typeof feedbackSubmissionSchema>
