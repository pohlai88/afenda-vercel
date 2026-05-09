import { describe, expect, it } from "vitest"

import { nextDueFromRecurrence } from "#features/onething"

describe("nextDueFromRecurrence", () => {
  it("returns null for empty rules", () => {
    expect(nextDueFromRecurrence(null, new Date())).toBeNull()
    expect(nextDueFromRecurrence("", new Date())).toBeNull()
    expect(nextDueFromRecurrence("   ", new Date())).toBeNull()
  })

  it("advances one UTC day for DAILY", () => {
    const from = new Date(Date.UTC(2026, 0, 10, 12, 0, 0))
    const next = nextDueFromRecurrence("FREQ=DAILY", from)
    expect(next).not.toBeNull()
    expect(next!.getUTCDate()).toBe(11)
  })

  it("advances seven UTC days for WEEKLY", () => {
    const from = new Date(Date.UTC(2026, 0, 3, 0, 0, 0))
    const next = nextDueFromRecurrence("FREQ=WEEKLY", from)
    expect(next).not.toBeNull()
    expect(next!.getUTCDate()).toBe(10)
  })

  it("returns null for unknown recurrence text", () => {
    const from = new Date(Date.UTC(2026, 0, 1, 0, 0, 0))
    expect(nextDueFromRecurrence("FREQ=MONTHLY", from)).toBeNull()
  })
})
