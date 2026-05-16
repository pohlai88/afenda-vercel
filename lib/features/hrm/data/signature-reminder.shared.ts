/** Reminder cadence after `sentAt` (3 reminders, then stop). */
export const SIGNATURE_REMINDER_OFFSETS_MS = [
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
] as const

export function nextSignatureReminderAt(
  sentAt: Date,
  reminderCount: number
): Date | null {
  const offset = SIGNATURE_REMINDER_OFFSETS_MS[reminderCount]
  if (offset === undefined) {
    return null
  }
  return new Date(sentAt.getTime() + offset)
}
