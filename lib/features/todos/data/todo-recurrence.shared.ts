/**
 * Minimal recurrence helper (no rrule dependency). Supports DAILY / WEEKLY tokens in stored rule text.
 */
export function nextDueFromRecurrence(
  rule: string | null | undefined,
  from: Date
): Date | null {
  if (!rule || rule.trim() === "") return null
  const u = rule.toUpperCase()
  const next = new Date(from.getTime())
  if (u.includes("DAILY")) {
    next.setUTCDate(next.getUTCDate() + 1)
    return next
  }
  if (u.includes("WEEKLY")) {
    next.setUTCDate(next.getUTCDate() + 7)
    return next
  }
  return null
}
