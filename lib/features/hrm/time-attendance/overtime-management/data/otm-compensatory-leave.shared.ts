/** Standard workday basis for converting payable OT minutes to leave days. */
export const OTM_STANDARD_MINUTES_PER_LEAVE_DAY = 480

export function payableMinutesToCompensatoryLeaveDays(
  payableMinutes: number
): number | null {
  if (payableMinutes <= 0) return null
  const days = payableMinutes / OTM_STANDARD_MINUTES_PER_LEAVE_DAY
  return Math.round(days * 10_000) / 10_000
}
