import { resolveRulePack } from "./payroll-rule-pack.server"

export type CountryPayrollCalendarSummary = {
  readonly countryCode: string
  readonly rulePackVersion: string
  readonly publicHolidayCount: number
  readonly sampleHolidayDates: readonly string[]
}

/**
 * Country payroll calendar metadata from active rule pack (HRM-MCP-010).
 * Cutoff/statutory filing deadlines are org-specific — not computed here.
 */
export function getCountryPayrollCalendarSummary(input: {
  readonly countryCode: string
  readonly year: number
  readonly stateCodes?: readonly string[]
  readonly atDate?: Date
}): CountryPayrollCalendarSummary | null {
  const atDate = input.atDate ?? new Date()
  try {
    const pack = resolveRulePack(input.countryCode, atDate)
    const holidays = pack.publicHolidays(input.year, [
      ...(input.stateCodes ?? []),
    ])
    return {
      countryCode: pack.countryCode,
      rulePackVersion: pack.version,
      publicHolidayCount: holidays.length,
      sampleHolidayDates: holidays.slice(0, 5).map((h) => h.date),
    }
  } catch {
    return null
  }
}
