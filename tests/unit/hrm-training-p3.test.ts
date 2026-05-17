import { describe, expect, it } from "vitest"

import {
  setTrainingPrerequisiteFormSchema,
  submitTrainingFeedbackFormSchema,
} from "#features/hrm/talent-management/training-development/schemas/training.schema"

const ORG_ID = "00000000-0000-4000-8000-000000000001"
const RECORD_ID = "00000000-0000-4000-8000-000000000002"
const COURSE_A = "00000000-0000-4000-8000-000000000010"
const COURSE_B = "00000000-0000-4000-8000-000000000011"

describe("submitTrainingFeedbackFormSchema", () => {
  it("accepts rating and optional comment", () => {
    const parsed = submitTrainingFeedbackFormSchema.safeParse({
      organizationId: ORG_ID,
      portalSlug: "acme-hr",
      recordId: RECORD_ID,
      feedbackRating: 4,
      feedbackText: "Clear instructor.",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects rating outside 1–5", () => {
    const parsed = submitTrainingFeedbackFormSchema.safeParse({
      organizationId: ORG_ID,
      portalSlug: "acme-hr",
      recordId: RECORD_ID,
      feedbackRating: 6,
    })
    expect(parsed.success).toBe(false)
  })
})

describe("setTrainingPrerequisiteFormSchema", () => {
  it("accepts course and prerequisite ids", () => {
    const parsed = setTrainingPrerequisiteFormSchema.safeParse({
      organizationId: ORG_ID,
      orgSlug: "acme",
      courseId: COURSE_A,
      prerequisiteCourseId: COURSE_B,
    })
    expect(parsed.success).toBe(true)
  })
})
