import "server-only"

import {
  getPayrollPeriod,
  hasApprovedPayrollPeriodLockApproval,
  isAttendancePayrollReadyForPeriod,
  listPayrollRunsForPeriod,
} from "./payroll.queries.server"
import { buildPayrollCloseSnapshot } from "./payroll-close.server"
import { derivePayrollPeriodReadiness } from "./payroll-readiness.shared"
import { countPayrollAnomaliesForPeriod } from "./payroll-variance.server"
import { assessPayrollPeriodCountryReadiness } from "../../multi-country-payroll/data/period-country-readiness.server"
import type { PayrollProcessingPeriodSnapshot } from "./payroll-processing-summary.shared"

export type { PayrollProcessingPeriodSnapshot } from "./payroll-processing-summary.shared"

export async function getPayrollProcessingPeriodSnapshot(
  organizationId: string,
  periodId: string
): Promise<PayrollProcessingPeriodSnapshot | null> {
  const period = await getPayrollPeriod(organizationId, periodId)
  if (!period) return null

  const periodEndIso =
    typeof period.periodEnd === "string"
      ? String(period.periodEnd).slice(0, 10)
      : (period.periodEnd as Date).toISOString().slice(0, 10)

  const [runs, attendanceReady, lockApprovalPresent, closeSnapshot, anomalies, countryReadiness] =
    await Promise.all([
      listPayrollRunsForPeriod(organizationId, periodId),
      isAttendancePayrollReadyForPeriod({
        organizationId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      }),
      hasApprovedPayrollPeriodLockApproval(organizationId, periodId),
      buildPayrollCloseSnapshot({ organizationId, periodId }),
      countPayrollAnomaliesForPeriod(organizationId, periodId),
      assessPayrollPeriodCountryReadiness({
        organizationId,
        periodId,
        periodEnd: periodEndIso,
      }),
    ])

  const blockingCloseCount =
    closeSnapshot?.exceptions.filter((item) => item.severity === "blocker")
      .length ?? 0

  const runsWithValidationIssues = runs.filter(
    (r) => r.validationIssues.length > 0
  ).length

  const allRunsComputed =
    runs.length > 0 && runs.every((r) => r.state === "computed")

  const readiness = derivePayrollPeriodReadiness({
    periodState: period.state,
    runCount: runs.length,
    runsWithValidationIssues,
    blockingAnomalyCount: anomalies.blocking,
    warningAnomalyCount: anomalies.warning,
    attendanceReady,
    lockApprovalPresent,
    allRunsComputed,
    missingProfileCount: countryReadiness.missingProfileCount,
    countryReadinessBlockingCount: countryReadiness.notReadyRunCount,
  })

  return {
    periodId: period.id,
    state: period.state,
    cutoffDate: period.paymentDate,
    payrollGroupCode: null,
    runCount: runs.length,
    attendanceReady,
    lockApprovalPresent,
    canLock: readiness.canLock,
    canFinalize: readiness.canLock,
    isLocked: readiness.isLocked,
    blockingCount: readiness.blockingCount,
    warningCount: readiness.warningCount,
    blockingCloseCount,
    readyForPosting:
      (period.state === "locked" || period.state === "finalized") &&
      blockingCloseCount === 0 &&
      readiness.canPost &&
      (closeSnapshot?.checklist.every((item) => item.status === "passed") ??
        false),
  }
}
