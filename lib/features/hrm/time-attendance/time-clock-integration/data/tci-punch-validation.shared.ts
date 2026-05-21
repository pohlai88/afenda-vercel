/** Pure punch validation helpers — unit-testable without DB. */

export const TCI_SHIFT_WINDOW_MS = 60 * 60 * 1000

export function isTimeClockPunchWithinShiftWindow(input: {
  readonly occurredAt: Date
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly windowMs?: number
}): boolean {
  const windowMs = input.windowMs ?? TCI_SHIFT_WINDOW_MS
  const earliest = input.scheduledStartAt.getTime() - windowMs
  const latest = input.scheduledEndAt.getTime() + windowMs
  const ts = input.occurredAt.getTime()
  return ts >= earliest && ts <= latest
}
