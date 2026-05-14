/**
 * Vietnam public holidays — placeholder set for VN-2024-01 composite pack.
 * Extend with full calendar (Tết, National Day, Hung Kings, etc.) in a new
 * `holidayVersion` when statutory leave accrual depends on public holidays.
 */

import type { HrmHolidaySeed } from "../../../payroll-rule-pack.server"

export const HOLIDAYS_VN_2024_CODE = "VN-HOLIDAY-2024-PLACEHOLDER" as const

/** Returns an empty list until a dated national calendar is registered. */
export function getVietnamHolidaysV2024(
  _year: number,
  _provinceCodes: string[]
): readonly HrmHolidaySeed[] {
  return []
}
