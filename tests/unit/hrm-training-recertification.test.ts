import { describe, expect, it } from "vitest"

import {
  buildRecertificationSourceReference,
  classifyRecertificationDueBand,
  computeTrainingExpiresAtDate,
  isRecertificationAssignmentDuplicate,
} from "../../lib/features/hrm/data/training-recertification.server"

describe("training recertification helpers", () => {
  it("classifies due bands", () => {
    const asOf = new Date("2026-05-16T00:00:00.000Z")
    expect(
      classifyRecertificationDueBand(new Date("2026-05-20T00:00:00.000Z"), asOf)
    ).toBe("30")
    expect(
      classifyRecertificationDueBand(new Date("2026-04-01T00:00:00.000Z"), asOf)
    ).toBe("expired")
  })

  it("builds stable source reference", () => {
    const ref = buildRecertificationSourceReference({
      id: "rec-1",
      completedAt: new Date("2025-06-01T00:00:00.000Z"),
    })
    expect(ref).toBe("record:rec-1:2025-06")
  })

  it("detects duplicate recertification assignment", () => {
    expect(
      isRecertificationAssignmentDuplicate({
        existingSourceReference: "record:x:2025-6",
        sourceReference: "record:x:2025-6",
      })
    ).toBe(true)
  })

  it("computes expiresAt date", () => {
    const completed = new Date("2026-01-01T00:00:00.000Z")
    const expires = computeTrainingExpiresAtDate(completed, 12)
    expect(expires?.getUTCFullYear()).toBe(2027)
  })
})
