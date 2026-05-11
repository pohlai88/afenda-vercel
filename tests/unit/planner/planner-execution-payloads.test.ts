import { describe, expect, it } from "vitest"

import {
  plannerRecurrenceRunPayloadSchema,
  plannerReminderRunPayloadSchema,
} from "#features/execution"

describe("planner execution payload schemas", () => {
  it("accepts planner recurrence workflow payloads", () => {
    const parsed = plannerRecurrenceRunPayloadSchema.safeParse({
      organizationId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      recurrenceId: "07fcc86c-5c11-4217-9491-eb4da8edec5f",
      actorUserId: "system",
      actorSessionId: null,
    })

    expect(parsed.success).toBe(true)
  })

  it("accepts planner reminder workflow payloads", () => {
    const parsed = plannerReminderRunPayloadSchema.safeParse({
      organizationId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      reminderId: "07fcc86c-5c11-4217-9491-eb4da8edec5f",
    })

    expect(parsed.success).toBe(true)
  })
})
