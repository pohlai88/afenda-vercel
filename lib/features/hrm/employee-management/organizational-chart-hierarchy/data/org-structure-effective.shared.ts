/** Returns true when a dated org record is effective on `asOf` (inclusive). */
export function isOrgRecordEffectiveAsOf(
  effectiveFrom: Date | null | undefined,
  asOf: Date
): boolean {
  if (!effectiveFrom) return true
  const asOfDay = startOfUtcDay(asOf)
  const effectiveDay = startOfUtcDay(effectiveFrom)
  return effectiveDay.getTime() <= asOfDay.getTime()
}

/** True when effectiveFrom is strictly after `asOf` (future-dated / planned). */
export function isOrgRecordPlannedForFuture(
  effectiveFrom: Date | null | undefined,
  asOf: Date
): boolean {
  if (!effectiveFrom) return false
  return startOfUtcDay(effectiveFrom).getTime() > startOfUtcDay(asOf).getTime()
}

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}
