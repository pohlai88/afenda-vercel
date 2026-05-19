import type { FwaSchedulePatternInput } from "./schemas/fwa.schema"
import type { HrmFwaArrangementKind } from "./schemas/fwa-workflow-state.shared"

/** Weekday-only office/remote quotas by arrangement kind (HRM-FWA-018/019). */
export type FwaWeekdayPolicy = {
  minOfficeDays?: number
  maxOfficeDays?: number
  maxRemoteDays?: number
}

export const FWA_WEEKDAY_POLICY_BY_KIND: Record<
  HrmFwaArrangementKind,
  FwaWeekdayPolicy
> = {
  remote: { maxOfficeDays: 0, maxRemoteDays: 5 },
  hybrid: { minOfficeDays: 1, maxRemoteDays: 4 },
  compressed: { minOfficeDays: 4, maxRemoteDays: 0 },
  flexible_hours: { minOfficeDays: 5, maxRemoteDays: 0 },
  staggered: { minOfficeDays: 5, maxRemoteDays: 0 },
  part_time: { minOfficeDays: 1, maxRemoteDays: 0 },
  temporary: { minOfficeDays: 0, maxRemoteDays: 5 },
}

const WEEKDAYS = new Set([1, 2, 3, 4, 5])

export function countFwaWeekdayModes(
  patterns: readonly FwaSchedulePatternInput[]
): { officeDays: number; remoteDays: number } {
  let officeDays = 0
  let remoteDays = 0
  for (const pattern of patterns) {
    if (!WEEKDAYS.has(pattern.dayOfWeek)) continue
    if (pattern.workMode === "office") officeDays += 1
    if (pattern.workMode === "remote") remoteDays += 1
  }
  return { officeDays, remoteDays }
}

export function isFwaPatternPolicyBreached(
  arrangementKind: string,
  patterns: readonly FwaSchedulePatternInput[]
): boolean {
  const policy =
    FWA_WEEKDAY_POLICY_BY_KIND[arrangementKind as HrmFwaArrangementKind]
  if (!policy) return false

  const { officeDays, remoteDays } = countFwaWeekdayModes(patterns)
  if (policy.minOfficeDays != null && officeDays < policy.minOfficeDays) {
    return true
  }
  if (policy.maxOfficeDays != null && officeDays > policy.maxOfficeDays) {
    return true
  }
  if (policy.maxRemoteDays != null && remoteDays > policy.maxRemoteDays) {
    return true
  }
  return false
}

export function isFwaWeeklyMinutesBreached(
  expectedWeeklyMinutes: number | null,
  patterns: readonly FwaSchedulePatternInput[]
): boolean {
  if (expectedWeeklyMinutes == null) return false
  const patternTotal = patterns.reduce(
    (sum, row) => sum + (row.expectedMinutes ?? 0),
    0
  )
  if (patternTotal <= 0) return false
  return Math.abs(patternTotal - expectedWeeklyMinutes) > 30
}
