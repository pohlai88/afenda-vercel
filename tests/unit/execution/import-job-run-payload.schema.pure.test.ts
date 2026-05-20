import { describe, expect, it } from "vitest"

import { importJobRunPayloadSchema } from "#features/execution"

describe("importJobRunPayloadSchema", () => {
  it("accepts trusted Server Action payload shape", () => {
    const parsed = importJobRunPayloadSchema.safeParse({
      jobId: "550e8400-e29b-41d4-a716-446655440000",
      organizationId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      actorUserId: "user_1",
      actorSessionId: "sess_1",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects invalid job id", () => {
    const parsed = importJobRunPayloadSchema.safeParse({
      jobId: "not-a-uuid",
      organizationId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      actorUserId: "user_1",
      actorSessionId: "sess_1",
    })
    expect(parsed.success).toBe(false)
  })
})
