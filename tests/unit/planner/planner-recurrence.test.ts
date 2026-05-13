import { describe, expect, it } from "vitest"

import {
  hasPlannerRecurrence,
  isPlannerRRuleValid,
  nextPlannerRunFromRecurrence,
} from "#features/planner/recurrence/planner-recurrence.shared"

describe("planner recurrence helper", () => {
  it("detects recurrence strings", () => {
    expect(hasPlannerRecurrence("FREQ=DAILY")).toBe(true)
    expect(hasPlannerRecurrence("")).toBe(false)
    expect(hasPlannerRecurrence(null)).toBe(false)
  })

  it("advances daily and weekly rules", () => {
    const base = new Date("2026-05-12T08:00:00.000Z")
    expect(
      nextPlannerRunFromRecurrence("FREQ=DAILY", base)?.toISOString()
    ).toBe("2026-05-13T08:00:00.000Z")
    expect(
      nextPlannerRunFromRecurrence(
        "FREQ=WEEKLY;INTERVAL=2",
        base
      )?.toISOString()
    ).toBe("2026-05-26T08:00:00.000Z")
  })

  it("respects weekday constraints", () => {
    const base = new Date("2026-05-13T08:00:00.000Z")
    expect(
      nextPlannerRunFromRecurrence("FREQ=WEEKLY;BYDAY=FR", base)?.toISOString()
    ).toBe("2026-05-15T08:00:00.000Z")
  })

  it("supports minutely and hourly intervals", () => {
    const base = new Date("2026-05-12T08:00:00.000Z")
    expect(
      nextPlannerRunFromRecurrence(
        "FREQ=MINUTELY;INTERVAL=30",
        base
      )?.toISOString()
    ).toBe("2026-05-12T08:30:00.000Z")
    expect(
      nextPlannerRunFromRecurrence(
        "FREQ=HOURLY;INTERVAL=4",
        base
      )?.toISOString()
    ).toBe("2026-05-12T12:00:00.000Z")
  })

  it("rejects invalid recurrence rules", () => {
    expect(isPlannerRRuleValid("FREQ=WEEKLY;BYDAY=FR")).toBe(true)
    expect(isPlannerRRuleValid("FREQ=BOGUS")).toBe(false)
    expect(nextPlannerRunFromRecurrence("FREQ=BOGUS", new Date())).toBeNull()
  })
})
