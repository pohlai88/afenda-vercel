import { getHolidaysV2026, HOLIDAYS_2026_CODE } from "./v2026.holidays"
import { getHolidaysV2027, HOLIDAYS_2027_CODE } from "./v2027.holidays"

export type MalaysiaHolidayTableCode =
  | typeof HOLIDAYS_2026_CODE
  | typeof HOLIDAYS_2027_CODE

/**
 * Resolve gazetted (or versioned estimate) public-holiday **dates** for Malaysia.
 *
 * Composite pack `holidayVersion` on MY-2026-01 remains `MY-HOLIDAY-2026` as the
 * manifest pin; this helper dispatches by **calendar year** so 2027 leave planning
 * does not throw once `v2027.holidays.ts` is registered here.
 */
export function resolveMalaysiaPublicHolidayDates(
  year: number,
  stateCodes: readonly string[]
): {
  readonly tableCode: MalaysiaHolidayTableCode
  readonly dates: readonly string[]
} {
  if (year === 2026) {
    return {
      tableCode: HOLIDAYS_2026_CODE,
      dates: getHolidaysV2026(2026, stateCodes),
    }
  }
  if (year === 2027) {
    return {
      tableCode: HOLIDAYS_2027_CODE,
      dates: getHolidaysV2027(2027, stateCodes),
    }
  }
  throw new Error(
    `Malaysia public holidays: no versioned table for calendar year ${year} (supported: 2026–2027). Add lib/features/hrm/data/rule-packs/malaysia/holidays/v${year}.holidays.ts and register it in resolve-malaysia-public-holidays.ts; see docs/_draft/malaysia-statutory-calendar-ops.md.`
  )
}
