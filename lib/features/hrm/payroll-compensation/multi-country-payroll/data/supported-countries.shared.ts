/**
 * Payroll countries with a registered rule pack (HRM-MCP-001).
 * TH/PH are reserved in the rule-pack interface but not yet implemented.
 */
export const HRM_PAYROLL_SUPPORTED_COUNTRY_CODES = [
  "MY",
  "SG",
  "ID",
  "VN",
] as const

export type HrmPayrollSupportedCountryCode =
  (typeof HRM_PAYROLL_SUPPORTED_COUNTRY_CODES)[number]

export function isHrmPayrollSupportedCountryCode(
  value: string
): value is HrmPayrollSupportedCountryCode {
  return (HRM_PAYROLL_SUPPORTED_COUNTRY_CODES as readonly string[]).includes(
    value
  )
}
