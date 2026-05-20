import type { FwaSchedulePatternInput } from "./schemas/fwa.schema"

export type FwaLeaveHalfDay = "none" | "morning" | "afternoon"

function eachDateInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T12:00:00.000Z`)
  const end = new Date(`${endDate}T12:00:00.000Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function workModeForDate(
  patterns: readonly FwaSchedulePatternInput[],
  dateIso: string
): FwaSchedulePatternInput["workMode"] | null {
  const dayOfWeek = new Date(`${dateIso}T12:00:00.000Z`).getUTCDay()
  return patterns.find((row) => row.dayOfWeek === dayOfWeek)?.workMode ?? null
}

/**
 * Leave & Attendance cross-check against an active flexible work pattern (HRM-FWA-024).
 */
export function validateLeaveAgainstFwaSchedule(input: {
  startDate: string
  endDate: string
  halfDay: FwaLeaveHalfDay
  patterns: readonly FwaSchedulePatternInput[]
}): { ok: true } | { ok: false; message: string } {
  if (input.patterns.length === 0) {
    return {
      ok: false,
      message:
        "Active flexible work arrangement has no schedule pattern for leave validation.",
    }
  }

  const remoteDays = input.patterns.filter(
    (pattern) => pattern.workMode === "remote"
  ).length

  if (input.halfDay !== "none" && remoteDays === 0) {
    return {
      ok: false,
      message:
        "Half-day leave is not aligned with the active office-only flexible work pattern.",
    }
  }

  const leaveDates = eachDateInclusive(input.startDate, input.endDate)
  const scheduledWorkDays = leaveDates.filter((date) => {
    const mode = workModeForDate(input.patterns, date)
    return mode === "office" || mode === "remote"
  })

  if (scheduledWorkDays.length === 0) {
    return {
      ok: false,
      message:
        "Leave dates do not overlap scheduled work days under the active flexible work arrangement.",
    }
  }

  return { ok: true }
}
