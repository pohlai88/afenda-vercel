import "server-only"

export function isoDateOnlyToUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function formatUtcDateOnly(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function calendarDayBeforeIso(isoDate: string): string {
  const dt = isoDateOnlyToUtcDate(isoDate)
  dt.setUTCDate(dt.getUTCDate() - 1)
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const da = String(dt.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${da}`
}
