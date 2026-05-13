import { describe, expect, it } from "vitest"

import { parsePlannerCaptureInput } from "#features/planner/commands/planner-capture-parser.shared"

const referenceDate = new Date("2026-05-13T00:00:00.000Z")
const parseOptions = { now: referenceDate, timeZone: "UTC" }

describe("planner capture parser", () => {
  it("extracts a due date from plain-language capture", () => {
    const parsed = parsePlannerCaptureInput(
      "review payroll variance tomorrow 9am",
      parseOptions
    )

    expect(parsed.title).toBe("review payroll variance")
    expect(parsed.dueAt?.toISOString()).toBe("2026-05-14T09:00:00.000Z")
    expect(parsed.reminder).toBeNull()
    expect(parsed.recurrence).toBeNull()
    expect(parsed.confidence).toBe("structured")
  })

  it("extracts weekday recurrence and first due time", () => {
    const parsed = parsePlannerCaptureInput(
      "file EA forms every weekday at 8am",
      parseOptions
    )

    expect(parsed.title).toBe("file EA forms")
    expect(parsed.dueAt?.toISOString()).toBe("2026-05-14T08:00:00.000Z")
    expect(parsed.recurrence?.rrule).toBe(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR"
    )
    expect(parsed.recurrence?.nextRunAt?.toISOString()).toBe(
      "2026-05-15T08:00:00.000Z"
    )
  })

  it("extracts interval weekly recurrence with weekday constraint", () => {
    const parsed = parsePlannerCaptureInput(
      "close vendor ticket every 2 weeks on Friday",
      parseOptions
    )

    expect(parsed.title).toBe("close vendor ticket")
    expect(parsed.dueAt?.toISOString()).toBe("2026-05-15T12:00:00.000Z")
    expect(parsed.recurrence?.rrule).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=FR")
    expect(parsed.recurrence?.nextRunAt?.toISOString()).toBe(
      "2026-05-29T12:00:00.000Z"
    )
  })

  it("keeps unsupported recurrence text in the title", () => {
    const parsed = parsePlannerCaptureInput(
      "review payroll every quarter",
      parseOptions
    )

    expect(parsed.title).toBe("review payroll every quarter")
    expect(parsed.recurrence).toBeNull()
    expect(parsed.warnings).toContain("unsupported_recurrence")
    expect(parsed.confidence).toBe("partial")
  })

  it("only creates reminders from explicit reminder phrases", () => {
    const implicit = parsePlannerCaptureInput(
      "review payroll variance tomorrow 9am",
      parseOptions
    )
    const explicit = parsePlannerCaptureInput(
      "review payroll variance tomorrow 9am remind me 1 hour before",
      parseOptions
    )

    expect(implicit.reminder).toBeNull()
    expect(explicit.title).toBe("review payroll variance")
    expect(explicit.reminder?.remindAt.toISOString()).toBe(
      "2026-05-14T08:00:00.000Z"
    )
  })
})
