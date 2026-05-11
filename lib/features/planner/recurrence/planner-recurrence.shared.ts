export function hasPlannerRecurrence(
  rrule: string | null | undefined
): boolean {
  return typeof rrule === "string" && rrule.trim().length > 0
}

function parseInterval(rrule: string): number {
  const match = rrule.toUpperCase().match(/INTERVAL=(\d+)/)
  const parsed = Number(match?.[1] ?? "1")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function nextPlannerRunFromRecurrence(
  rrule: string | null | undefined,
  from: Date
): Date | null {
  if (!hasPlannerRecurrence(rrule)) return null

  const next = new Date(from.getTime())
  const rule = rrule!.toUpperCase()
  const interval = parseInterval(rule)

  if (rule.includes("FREQ=MINUTELY")) {
    next.setUTCMinutes(next.getUTCMinutes() + interval)
    return next
  }
  if (rule.includes("FREQ=HOURLY")) {
    next.setUTCHours(next.getUTCHours() + interval)
    return next
  }
  if (rule.includes("FREQ=DAILY")) {
    next.setUTCDate(next.getUTCDate() + interval)
    return next
  }
  if (rule.includes("FREQ=WEEKLY")) {
    next.setUTCDate(next.getUTCDate() + 7 * interval)
    return next
  }
  if (rule.includes("FREQ=MONTHLY")) {
    next.setUTCMonth(next.getUTCMonth() + interval)
    return next
  }
  return null
}
