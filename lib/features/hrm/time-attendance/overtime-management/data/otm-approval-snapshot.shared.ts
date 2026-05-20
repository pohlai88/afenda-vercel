import type { HrmOtmDayCategory, HrmOtmTimingKind } from "../schemas/otm.schema"

export type OtmApprovalStage = "manager" | "hr"

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
  approvalStage?: OtmApprovalStage
  routingRuleId?: string | null
  routingApproverKind?: string | null
  managerApprovedByUserId?: string
  managerApprovedAt?: string
}

export function buildOtmApprovalSnapshot(
  input: OtmApprovalSnapshot
): OtmApprovalSnapshot {
  return input
}

export function withOtmApprovalStage(
  snapshot: OtmApprovalSnapshot,
  stage: OtmApprovalStage
): OtmApprovalSnapshot {
  return { ...snapshot, approvalStage: stage }
}

export function parseOtmApprovalSnapshot(
  raw: unknown
): OtmApprovalSnapshot | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  if (typeof record.employeeId !== "string") return null
  if (typeof record.workDate !== "string") return null
  if (typeof record.durationMinutes !== "number") return null
  return record as OtmApprovalSnapshot
}
