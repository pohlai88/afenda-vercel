import { describe, expect, it } from "vitest"

import { buildRecertificationSourceReference } from "../../lib/features/hrm/data/training-recertification.server"

describe("training bridge contracts", () => {
  it("recertification source reference is stable for idempotency", () => {
    const record = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      completedAt: new Date("2026-03-15T00:00:00.000Z"),
    } as const
    expect(buildRecertificationSourceReference(record)).toBe(
      buildRecertificationSourceReference(record)
    )
  })
})
