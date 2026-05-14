/**
 * Default leave type seeds for Vietnam payroll pack (labels via i18n).
 */

export const VN_EMPLOYMENT_LEAVE_V2024_01_CODE = "VN-AL-2024-01" as const

export const VN_EMPLOYMENT_LEAVE_TYPES_2024 = [
  { code: "annual", labelKey: "hrm.leaveType.annual" },
  { code: "sick", labelKey: "hrm.leaveType.sick" },
  { code: "unpaid", labelKey: "hrm.leaveType.unpaid" },
  { code: "maternity", labelKey: "hrm.leaveType.maternity" },
] as const
