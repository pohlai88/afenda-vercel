import { describe, expect, it } from "vitest"

import {
  canTransitionTrainingAssignment,
  computeTrainingExpiresAt,
  createTrainingCourseFormSchema,
  normalizeTrainingCourseCode,
} from "../../lib/features/hrm/schemas/training.schema"

describe("training schema helpers", () => {
  it("normalizes course codes", () => {
    expect(normalizeTrainingCourseCode("  fire-safety  ")).toBe("FIRE-SAFETY")
  })

  it("computes expiry from recertification months", () => {
    const completed = new Date("2026-01-15T00:00:00.000Z")
    const expires = computeTrainingExpiresAt(completed, 12)
    expect(expires).not.toBeNull()
    expect(expires?.getUTCFullYear()).toBe(2027)
  })

  it("allows assigned → completed and blocks completed → assigned", () => {
    expect(canTransitionTrainingAssignment("assigned", "completed")).toBe(true)
    expect(canTransitionTrainingAssignment("completed", "assigned")).toBe(false)
  })

  it("parses create course form statutory flag", () => {
    const parsed = createTrainingCourseFormSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      orgSlug: "acme",
      code: "OSH-101",
      name: "Workplace safety",
      statutoryFlag: "on",
      statutoryAuthorityCode: "MY-DOSH",
      recertificationIntervalMonths: 24,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.statutoryFlag).toBe(true)
      expect(parsed.data.statutoryAuthorityCode).toBe("MY-DOSH")
    }
  })
})
