export const SFT_CONFLICT_KINDS = [
  "leave_overlap",
  "shift_overlap",
  "insufficient_rest",
  "weekly_hours_exceeded",
] as const

export type SftConflictKind = (typeof SFT_CONFLICT_KINDS)[number]

export type SftScheduleConflict = {
  readonly kind: SftConflictKind
  readonly message: string
  readonly attendanceDate?: string
}

export function mergeSftConflicts(
  ...groups: readonly SftScheduleConflict[][]
): SftScheduleConflict[] {
  const seen = new Set<string>()
  const merged: SftScheduleConflict[] = []

  for (const group of groups) {
    for (const conflict of group) {
      const key = `${conflict.kind}:${conflict.attendanceDate ?? ""}:${conflict.message}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(conflict)
    }
  }

  return merged
}

export function scheduledMinutesBetween(
  scheduledStartAt: Date,
  scheduledEndAt: Date
): number {
  return Math.max(
    0,
    Math.round((scheduledEndAt.getTime() - scheduledStartAt.getTime()) / 60_000)
  )
}

export function isoWeekStart(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`)
  const weekday = day.getUTCDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(day.getTime() + offset * 86_400_000)
  return monday.toISOString().slice(0, 10)
}

export function addDaysIso(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`)
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}
