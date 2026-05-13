/**
 * Singapore public holidays — 2026.
 *
 * Source: Ministry of Manpower Singapore public holiday calendar. Append-only;
 * shipping a corrected calendar means a new source version rather than rewriting
 * payroll history.
 *
 * Rule-pack version: SG-HOLIDAY-2026
 */

export const HOLIDAYS_SG_2026_CODE = "SG-HOLIDAY-2026" as const

const SG_2026: readonly { readonly date: string; readonly nameKey: string }[] =
  [
    { date: "2026-01-01", nameKey: "Dashboard.Hrm.rulePackSg.holidayNewYear" },
    {
      date: "2026-02-17",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayChineseNewYear",
    },
    {
      date: "2026-02-18",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayChineseNewYearSecondDay",
    },
    {
      date: "2026-03-21",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayHariRayaPuasa",
    },
    {
      date: "2026-04-03",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayGoodFriday",
    },
    { date: "2026-05-01", nameKey: "Dashboard.Hrm.rulePackSg.holidayLabour" },
    {
      date: "2026-05-27",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayHariRayaHaji",
    },
    { date: "2026-05-31", nameKey: "Dashboard.Hrm.rulePackSg.holidayVesak" },
    { date: "2026-08-09", nameKey: "Dashboard.Hrm.rulePackSg.holidayNational" },
    {
      date: "2026-11-08",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayDeepavali",
    },
    {
      date: "2026-12-25",
      nameKey: "Dashboard.Hrm.rulePackSg.holidayChristmas",
    },
  ]

export function getSingaporeHolidaysV2026(
  year: number,
  _stateCodes: readonly string[]
): readonly { readonly date: string; readonly nameKey: string }[] {
  if (year !== 2026) return []
  return SG_2026
}
