export function daysBetweenIsoDates(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00Z`).getTime()
  const end = new Date(`${to}T12:00:00Z`).getTime()
  return Math.floor((end - start) / (24 * 60 * 60 * 1000))
}

export function isOtmWorkDatePastClaimDeadline(input: {
  workDate: string
  claimDeadlineDays: number | null
  todayIso?: string
}): boolean {
  if (input.claimDeadlineDays == null || input.claimDeadlineDays <= 0) {
    return false
  }
  const today = input.todayIso ?? new Date().toISOString().slice(0, 10)
  return daysBetweenIsoDates(input.workDate, today) > input.claimDeadlineDays
}
