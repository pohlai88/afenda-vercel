import type { HrmOtmDayCategory, HrmOtmTimingKind } from "../schemas/otm.schema"

export type OtmApprovalSnapshot = {
  employeeId: string
  employeeNumber: string | null
  employeeFullName: string
  workDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  timingKind: HrmOtmTimingKind
  dayCategory: HrmOtmDayCategory
  reason: string | null
  requestedAt: string
}

export function buildOtmApprovalSnapshot(
  input: OtmApprovalSnapshot
): OtmApprovalSnapshot {
  return input
}
