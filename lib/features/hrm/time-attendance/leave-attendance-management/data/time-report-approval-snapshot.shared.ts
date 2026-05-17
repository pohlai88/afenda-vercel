import type { HrmTimeReportKind } from "../schemas/time-report.schema"

export type TimeReportApprovalSnapshot = {
  readonly reportKind: HrmTimeReportKind
  readonly employeeId: string
  readonly employeeNumber: string
  readonly employeeFullName: string
  readonly workDate: string | null
  readonly overtimeMinutes: number | null
  readonly tripStartDate: string | null
  readonly tripEndDate: string | null
  readonly destination: string | null
  readonly reason: string | null
  /** ISO-8601 instant string for digest-stable JSON. */
  readonly requestedAt: string
}

export function buildTimeReportApprovalSnapshot(
  input: Omit<TimeReportApprovalSnapshot, "requestedAt"> & {
    readonly requestedAt: Date
  }
): TimeReportApprovalSnapshot {
  return {
    ...input,
    requestedAt: input.requestedAt.toISOString(),
  }
}
