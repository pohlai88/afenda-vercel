export type BenefitDateInput = string | Date

const DAY_MS = 24 * 60 * 60 * 1000

function assertValidDateParts(
  year: number,
  month: number,
  day: number,
  fieldName: string
): void {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid ${fieldName}: expected a calendar date`)
  }
}

export function toBenefitUtcDay(
  value: BenefitDateInput,
  fieldName = "date"
): number {
  if (value instanceof Date) {
    const time = value.getTime()
    if (!Number.isFinite(time)) {
      throw new Error(`Invalid ${fieldName}: expected a valid Date`)
    }
    return Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    )
  }

  const datePart = value.slice(0, 10)
  const [yearRaw, monthRaw, dayRaw] = datePart.split("-")
  const year = Number.parseInt(yearRaw ?? "", 10)
  const month = Number.parseInt(monthRaw ?? "", 10)
  const day = Number.parseInt(dayRaw ?? "", 10)
  assertValidDateParts(year, month, day, fieldName)

  const utcDay = Date.UTC(year, month - 1, day)
  const rendered = formatBenefitUtcDay(utcDay)
  if (rendered !== datePart) {
    throw new Error(`Invalid ${fieldName}: expected a real calendar date`)
  }
  return utcDay
}

export function formatBenefitUtcDay(utcDay: number): string {
  return new Date(utcDay).toISOString().slice(0, 10)
}

export function addBenefitDays(value: BenefitDateInput, days: number): string {
  if (!Number.isInteger(days)) {
    throw new Error("Benefit day offset must be an integer")
  }
  return formatBenefitUtcDay(toBenefitUtcDay(value) + days * DAY_MS)
}

export function benefitDayDiff(
  start: BenefitDateInput,
  end: BenefitDateInput
): number {
  return Math.floor(
    (toBenefitUtcDay(end, "end") - toBenefitUtcDay(start, "start")) / DAY_MS
  )
}

export function benefitInclusiveDayCount(
  start: BenefitDateInput,
  end: BenefitDateInput
): number {
  const diff = benefitDayDiff(start, end)
  return diff < 0 ? 0 : diff + 1
}

export type BenefitDateOverlap = {
  readonly start: string
  readonly end: string
  readonly days: number
  readonly ratio: number
}

export function benefitDayOverlap(params: {
  readonly rangeStart: BenefitDateInput
  readonly rangeEnd: BenefitDateInput
  readonly windowStart: BenefitDateInput
  readonly windowEnd: BenefitDateInput
}): BenefitDateOverlap | null {
  const rangeStart = toBenefitUtcDay(params.rangeStart, "rangeStart")
  const rangeEnd = toBenefitUtcDay(params.rangeEnd, "rangeEnd")
  const windowStart = toBenefitUtcDay(params.windowStart, "windowStart")
  const windowEnd = toBenefitUtcDay(params.windowEnd, "windowEnd")
  if (rangeEnd < rangeStart) {
    throw new Error("Benefit date range end must be on or after range start")
  }
  if (windowEnd < windowStart) {
    throw new Error("Benefit window end must be on or after window start")
  }

  const start = Math.max(rangeStart, windowStart)
  const end = Math.min(rangeEnd, windowEnd)
  if (end < start) return null

  const days = Math.floor((end - start) / DAY_MS) + 1
  const windowDays = Math.floor((windowEnd - windowStart) / DAY_MS) + 1
  return {
    start: formatBenefitUtcDay(start),
    end: formatBenefitUtcDay(end),
    days,
    ratio: days / windowDays,
  }
}
