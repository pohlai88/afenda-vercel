import type {
  HrmOtmDayCategory,
  HrmOtmRequestState,
} from "../schemas/otm-workflow-state.shared"

export type OtmEmployeeChoiceRow = {
  id: string
  employeeNumber: string | null
  legalName: string
}

export type OtmEmployeeContextRow = {
  id: string
  employeeNumber: string | null
  legalName: string
  managerEmployeeId: string | null
  archivedAt: Date | null
}

export type OtmTypeChoiceRow = {
  id: string
  code: string
  label: string
  dayCategory: string
}

export type OtmEligibilityRuleRow = {
  id: string
  overtimeTypeId: string
  overtimeTypeLabel: string
  departmentId: string | null
  jobGradeId: string | null
  employmentType: string | null
  legalEntityCode: string | null
  countryCode: string | null
  workLocationCode: string | null
  positionId: string | null
  workerCategory: string | null
  policyGroupCode: string | null
  allowException: boolean
  isActive: boolean
}

export type OtmRateRuleRow = {
  id: string
  overtimeTypeId: string
  overtimeTypeLabel: string
  multiplierHundredths: number
  countryCode: string | null
  workerCategory: string | null
  earningCode: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  isActive: boolean
}

export type OtmPayrollExportRow = {
  requestId: string
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string | null
  workDate: string
  payableMinutes: number
  multiplierHundredths: number
  earningCode: string
  state: HrmOtmRequestState
}

export type OtmAttendanceReconcileRow = {
  requestId: string
  employeeFullName: string | null
  workDate: string
  payableMinutes: number
  attendanceMinutes: number | null
  varianceMinutes: number | null
}

export type OrgOtmRequestRow = {
  id: string
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string | null
  workDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  timingKind: string
  dayCategory: HrmOtmDayCategory
  reason: string | null
  state: HrmOtmRequestState
  requestedAt: Date
  currentApprovalId: string | null
  currentApproverUserId: string | null
}
