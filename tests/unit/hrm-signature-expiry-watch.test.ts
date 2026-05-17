import { describe, expect, it } from "vitest"

import { nextSignatureReminderAt } from "#features/tools/server"

describe("signature reminder schedule", () => {
  it("schedules first reminder three days after send", () => {
    const sentAt = new Date("2026-01-01T12:00:00.000Z")
    const next = nextSignatureReminderAt(sentAt, 0)
    expect(next?.toISOString()).toBe("2026-01-04T12:00:00.000Z")
  })

  it("returns null after final reminder offset", () => {
    const sentAt = new Date("2026-01-01T12:00:00.000Z")
    expect(nextSignatureReminderAt(sentAt, 3)).toBeNull()
  })
})
