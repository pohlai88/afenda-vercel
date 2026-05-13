import { RRule } from "rrule"

export function hasPlannerRecurrence(
  rrule: string | null | undefined
): boolean {
  return typeof rrule === "string" && rrule.trim().length > 0
}

export function normalizePlannerRRule(
  rrule: string | null | undefined
): string | null {
  if (!hasPlannerRecurrence(rrule)) return null

  const trimmed = rrule!.trim()
  const rruleLine =
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^RRULE:/i.test(line)) ?? trimmed

  const normalized = rruleLine
    .replace(/^RRULE:/i, "")
    .trim()
    .toUpperCase()
  return normalized.length > 0 ? normalized : null
}

export function isPlannerRRuleValid(rrule: string | null | undefined): boolean {
  const normalized = normalizePlannerRRule(rrule)
  if (!normalized) return false

  try {
    const parsed = RRule.parseString(normalized)
    return typeof parsed.freq === "number"
  } catch {
    return false
  }
}

export function nextPlannerRunFromRecurrence(
  rrule: string | null | undefined,
  from: Date
): Date | null {
  const normalized = normalizePlannerRRule(rrule)
  if (!normalized) return null

  try {
    const parsed = RRule.parseString(normalized)
    if (typeof parsed.freq !== "number") return null

    const rule = new RRule(
      {
        ...parsed,
        dtstart: from,
      },
      true
    )
    return rule.after(from, false)
  } catch {
    return null
  }
}
