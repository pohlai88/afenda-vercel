import type { HrmOtmRoundingMode } from "../schemas/otm-workflow-state.shared"

/** Serializable overtime policy row (safe across RSC → client boundaries). */
export type OtmPolicyRow = {
  organizationId: string
  minDurationMinutes: number
  dailyCapMinutes: number | null
  weeklyCapMinutes: number | null
  monthlyCapMinutes: number | null
  roundingIntervalMinutes: number | null
  roundingMode: HrmOtmRoundingMode
  compareAttendanceEnabled: boolean
  compareShiftEnabled: boolean
  claimDeadlineDays: number | null
  enforceClaimDeadlineOnSubmit: boolean
  requireHrSecondApproval: boolean
  managerChainMaxDepth: number
  allowCompensatoryTime: boolean
  compensatoryLeaveTypeCode: string | null
  defaultEarningCode: string
}

export const OTM_DEFAULT_POLICY: OtmPolicyRow = {
  organizationId: "",
  minDurationMinutes: 0,
  dailyCapMinutes: null,
  weeklyCapMinutes: null,
  monthlyCapMinutes: null,
  roundingIntervalMinutes: null,
  roundingMode: "none",
  compareAttendanceEnabled: false,
  compareShiftEnabled: true,
  claimDeadlineDays: null,
  enforceClaimDeadlineOnSubmit: false,
  requireHrSecondApproval: false,
  managerChainMaxDepth: 1,
  allowCompensatoryTime: false,
  compensatoryLeaveTypeCode: null,
  defaultEarningCode: "OT",
}
