import "server-only"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { resolveRulePack } from "../../../payroll-compensation/multi-country-payroll/data/payroll-rule-pack.server"

const DEFAULT_WEEKEND_DAYS = [0, 6] as const

export type LeaveRequestCalendar = {
  weekendDays: readonly number[]
  publicHolidayDates: readonly string[]
}

export function resolveLeaveRequestCalendar(input: {
  countryCode: string | null
  workStateCode: string | null
  startDate: string
  endDate: string
}): LeaveRequestCalendar {
  const countryCode = input.countryCode?.trim().toUpperCase()
  if (!countryCode) {
    return { weekendDays: DEFAULT_WEEKEND_DAYS, publicHolidayDates: [] }
  }

  const stateCodes = input.workStateCode?.trim()
    ? [input.workStateCode.trim().toUpperCase()]
    : []
  const holidayDates = new Set<string>()

  for (const year of yearsInRange(input.startDate, input.endDate)) {
    try {
      const pack = resolveRulePack(
        countryCode,
        isoDateOnlyToUtcDate(`${year}-01-01`)
      )
      for (const holiday of pack.publicHolidays(year, stateCodes)) {
        holidayDates.add(holiday.date)
      }
    } catch {
      // Unsupported country/year combinations fall back to weekend-only duration.
      continue
    }
  }

  return {
    weekendDays: DEFAULT_WEEKEND_DAYS,
    publicHolidayDates: [...holidayDates].sort(),
  }
}

function yearsInRange(startDate: string, endDate: string): number[] {
  const start = isoDateOnlyToUtcDate(startDate)
  const end = isoDateOnlyToUtcDate(endDate)
  const years: number[] = []

  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year += 1
  ) {
    years.push(year)
  }

  return years
}
