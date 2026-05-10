import { describe, expect, it } from "vitest"

import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
} from "#features/org-feedback/constants"
import { feedbackSubmissionSchema } from "#features/org-feedback/schemas/feedback.schema"
import { feedbackTransitionFormSchema } from "#features/org-feedback/schemas/feedback-transition.schema"

describe("feedbackSubmissionSchema", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = feedbackSubmissionSchema.safeParse({
      category: "idea",
      severity: "normal",
      message: "hello world",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects short messages", () => {
    const parsed = feedbackSubmissionSchema.safeParse({
      category: "bug",
      severity: "high",
      message: "hi",
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects messages over max length", () => {
    const parsed = feedbackSubmissionSchema.safeParse({
      category: "other",
      severity: "normal",
      message: "x".repeat(FEEDBACK_MESSAGE_MAX + 1),
    })
    expect(parsed.success).toBe(false)
  })

  it("enforces min length constant alignment", () => {
    expect(FEEDBACK_MESSAGE_MIN).toBeGreaterThan(0)
    const parsed = feedbackSubmissionSchema.safeParse({
      category: "praise",
      severity: "normal",
      message: "a".repeat(FEEDBACK_MESSAGE_MIN),
    })
    expect(parsed.success).toBe(true)
  })
})

describe("feedbackTransitionFormSchema", () => {
  it("accepts acknowledge without note", () => {
    const parsed = feedbackTransitionFormSchema.safeParse({
      id: "019b5c8e-7c0a-7b3e-a0a0-000000000001",
      transition: "acknowledge",
      resolutionNote: "",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.resolutionNote).toBeNull()
    }
  })

  it("accepts resolve with note", () => {
    const parsed = feedbackTransitionFormSchema.safeParse({
      id: "row-1",
      transition: "resolve",
      resolutionNote: "Fixed in 2.1",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects empty id", () => {
    const parsed = feedbackTransitionFormSchema.safeParse({
      id: "",
      transition: "reject",
      resolutionNote: null,
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects unknown transition", () => {
    const parsed = feedbackTransitionFormSchema.safeParse({
      id: "abc",
      transition: "merge",
      resolutionNote: null,
    })
    expect(parsed.success).toBe(false)
  })
})
