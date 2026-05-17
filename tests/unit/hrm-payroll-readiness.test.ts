import { describe, expect, it } from "vitest"

import { derivePayrollPeriodReadiness } from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-readiness.shared"

describe("payroll-readiness", () => {
  it("blocks lock when validation issues or blocking anomalies exist", () => {
    const ready = derivePayrollPeriodReadiness({
      periodState: "preparing",
      runCount: 5,
      runsWithValidationIssues: 0,
      blockingAnomalyCount: 0,
      warningAnomalyCount: 0,
      attendanceReady: true,
      lockApprovalPresent: true,
      allRunsComputed: true,
      missingProfileCount: 0,
      countryReadinessBlockingCount: 0,
    })
    expect(ready.canLock).toBe(true)

    const blocked = derivePayrollPeriodReadiness({
      periodState: "preparing",
      runCount: 5,
      runsWithValidationIssues: 1,
      blockingAnomalyCount: 1,
      warningAnomalyCount: 2,
      attendanceReady: true,
      lockApprovalPresent: true,
      allRunsComputed: true,
      missingProfileCount: 0,
      countryReadinessBlockingCount: 0,
    })
    expect(blocked.canLock).toBe(false)
    expect(blocked.blockingCount).toBeGreaterThan(0)
    expect(blocked.warningCount).toBe(2)
  })
})
