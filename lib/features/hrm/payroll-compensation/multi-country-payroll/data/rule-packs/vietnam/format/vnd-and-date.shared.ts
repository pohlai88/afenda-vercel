/**
 * Vietnam-facing currency and date helpers for payslips, statutory exports,
 * and UI copy. Pure functions — safe for Client Components via `#features/hrm/client`.
 */

const VND_SYMBOL = "₫"

/** Format integer VND with Vietnamese grouping (dot) + trailing symbol. */
export function formatVnd(amountVnd: number): string {
  if (!Number.isFinite(amountVnd)) return `0 ${VND_SYMBOL}`
  const rounded = Math.round(amountVnd)
  const neg = rounded < 0
  const abs = Math.abs(rounded)
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${neg ? "-" : ""}${grouped} ${VND_SYMBOL}`
}

/**
 * Parse strings like "1.234.567 ₫" or "1234567" into integer VND.
 * Returns NaN when unparseable.
 */
export function parseVnd(input: string): number {
  const s = input.replace(/\s/g, "").replace(VND_SYMBOL, "").trim()
  if (!s) return Number.NaN
  const normalized = s.replace(/\./g, "")
  const n = Number.parseInt(normalized, 10)
  return Number.isFinite(n) ? n : Number.NaN
}

/** Literary Vietnamese calendar phrase (operator-facing, not ISO). */
export function formatDateVnLiterary(date: Date): string {
  const d = date.getUTCDate()
  const m = date.getUTCMonth() + 1
  const y = date.getUTCFullYear()
  return `ngày ${d} tháng ${m} năm ${y}`
}

const VN_LITERARY_RE = /^ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})$/u

/** Parse `formatDateVnLiterary` output as UTC midnight. */
export function parseVnLiteraryDate(input: string): Date | null {
  const m = input.trim().match(VN_LITERARY_RE)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (!month || month > 12 || !day || day > 31) return null
  const d = new Date(Date.UTC(year, month - 1, day))
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null
  }
  return d
}

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isWeekendUtc(d: Date): boolean {
  const w = d.getUTCDay()
  return w === 0 || w === 6
}

/**
 * Count business days in [start, end] (inclusive), UTC date boundaries.
 * Skips weekends; skips dates in `holidayYmdUtc` (YYYY-MM-DD, UTC).
 */
export function countBusinessDaysVn(
  start: Date,
  end: Date,
  holidayYmdUtc: ReadonlySet<string> = new Set()
): number {
  const t0 = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  )
  const t1 = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  if (t1 < t0) return 0
  let n = 0
  for (let t = t0; t <= t1; t += 86_400_000) {
    const d = new Date(t)
    if (isWeekendUtc(d)) continue
    if (holidayYmdUtc.has(toYmdUtc(d))) continue
    n++
  }
  return n
}

/** True when `date` (UTC calendar day) appears in `holidayYmdUtc`. */
export function isVnHolidayYmd(
  date: Date,
  holidayYmdUtc: ReadonlySet<string>
): boolean {
  return holidayYmdUtc.has(toYmdUtc(date))
}
