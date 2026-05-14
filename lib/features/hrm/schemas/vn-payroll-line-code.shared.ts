import { z } from "zod"

/**
 * Canonical Vietnam payroll line `code` values for `hrm_payroll_line.code`
 * when the VN composite rule pack is active. Rule-pack emitters should
 * prefer these strings for CSV / statutory pack alignment.
 */
export const HRM_VN_PAYROLL_LINE_CODES = [
  "VN_BHXH_EE",
  "VN_BHXH_ER",
  "VN_BHYT_EE",
  "VN_BHYT_ER",
  "VN_BHTN_EE",
  "VN_BHTN_ER",
  "VN_PIT",
  "VN_PIT_RELIEF_PERSONAL",
  "VN_PIT_RELIEF_DEPENDENT",
  "VN_UNION_FEE",
] as const

export type HrmVnPayrollLineCode = (typeof HRM_VN_PAYROLL_LINE_CODES)[number]

export const hrmVnPayrollLineCodeSchema = z.enum(HRM_VN_PAYROLL_LINE_CODES)
