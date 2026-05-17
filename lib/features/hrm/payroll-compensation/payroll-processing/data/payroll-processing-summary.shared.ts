/** Client-serializable payroll period readiness snapshot (HRM-PAY). */
export type PayrollProcessingPeriodSnapshot = {
  readonly periodId: string
  readonly state: string
  readonly cutoffDate: string | null
  readonly payrollGroupCode: string | null
  readonly runCount: number
  readonly attendanceReady: boolean
  readonly lockApprovalPresent: boolean
  readonly canLock: boolean
  readonly isLocked: boolean
  readonly blockingCount: number
  readonly warningCount: number
  readonly blockingCloseCount: number
  readonly readyForPosting: boolean
  /** @deprecated Use canLock */
  readonly canFinalize: boolean
}
