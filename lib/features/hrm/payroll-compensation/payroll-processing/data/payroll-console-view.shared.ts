import type { ReactNode } from "react"

import type { PayrollSurfaceCapabilities } from "./payroll-capabilities.shared"
import type { PayrollPeriodTraceability } from "./payroll-engine.server"
import type { PayrollCloseSnapshot } from "./payroll-close.shared"
import type { PayrollPostingRecord } from "./payroll-posting.shared"

export type PayrollConsolePeriod = {
  readonly id: string
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly cutoffDate: string | null
  readonly paymentDate: string
  readonly payrollGroupCode: string | null
  readonly currency: string
  readonly state: string
  readonly lockedByUserId: string | null
  readonly lockedAt: string | null
  readonly finalizedRunId: string | null
  readonly rulePackVersion: string | null
  readonly postedByUserId: string | null
  readonly postedAt: string | null
  readonly postedJournalBatchId: string | null
  readonly createdByUserId: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export type PayrollConsoleRun = {
  readonly id: string
  readonly organizationId: string
  readonly periodId: string
  readonly employeeId: string
  readonly employeeLegalName: string
  readonly employeeNumber: string
  readonly contractId: string | null
  readonly profileId: string | null
  readonly state: string
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
  readonly inputDigest: string | null
  readonly computedAt: string | null
  readonly computedByUserId: string | null
  readonly overriddenFromBureau: boolean
  readonly validationIssues: Array<{ code: string; message: string }>
}

export type PayrollPeriodConsoleView = {
  readonly period: PayrollConsolePeriod
  readonly runs: PayrollConsoleRun[]
  /** Server-rendered Pattern C run directory when runs are visible in the period card. */
  readonly runsList: ReactNode | null
  /** Server-rendered Pattern C close checklist when a close snapshot exists. */
  readonly closeChecklistList: ReactNode | null
  /** Server-rendered Pattern C traceability questions for the period card. */
  readonly traceabilityList: ReactNode | null
  readonly traceability: PayrollPeriodTraceability
  readonly closeSnapshot: PayrollCloseSnapshot | null
  readonly postingRecord: PayrollPostingRecord | null
  readonly pendingLockApprovalId: string | null
}

export type PayrollConsoleProps = {
  readonly capabilities: PayrollSurfaceCapabilities
  readonly periods: PayrollPeriodConsoleView[]
}
