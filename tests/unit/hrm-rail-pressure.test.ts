import { describe, expect, it } from "vitest"

import {
  HRM_RAIL_PRESSURE_THRESHOLDS,
  deriveHrmBenefitsPressure,
  deriveHrmCompliancePressure,
  deriveHrmLeavePressure,
  deriveHrmPayrollPressure,
  type BenefitsPressureInput,
  type CompliancePressureInput,
  type LeavePressureInput,
  type PayrollPressureInput,
} from "#features/hrm/hrm-rail-pressure.shared"

/**
 * Phase 2 of the Working Memory Rail (`docs/_draft/working-memory-rail-plan.md`)
 * locks two doctrines for every workbench:
 *
 *   1. Empty slots **must** hide (conditional density). A zero-pressure
 *      derivation returns `null`, not `{ count: 0, tone: "default" }`.
 *   2. Pressure badges carry **semantic tone**. Operators read color
 *      before number — `attention` / `critical` must reflect threshold
 *      crossings (count + age + SLA) rather than arbitrary mappings.
 *
 * Each test below pins one boundary so changing a threshold constant
 * requires updating a named test (and reviewing the policy intent).
 * These helpers stay pure — no DB, no `server-only`, no clock reads —
 * so this entire file runs in the default Node Vitest pool.
 */

const DAY_MS = 24 * 60 * 60 * 1000

const LEAVE_CRITICAL_BOUNDARY_MS =
  HRM_RAIL_PRESSURE_THRESHOLDS.leaveDecisionCriticalAgeDays * DAY_MS

const PAYROLL_LOCK_CRITICAL_BOUNDARY_MS =
  HRM_RAIL_PRESSURE_THRESHOLDS.payrollLockCriticalAgeDays * DAY_MS

const COMPLIANCE_SUBMITTED_CRITICAL_BOUNDARY_MS =
  HRM_RAIL_PRESSURE_THRESHOLDS.complianceSubmittedCriticalAgeDays * DAY_MS

function leaveInput(
  overrides: Partial<LeavePressureInput> = {}
): LeavePressureInput {
  return {
    pendingApprovalsCount: 0,
    oldestPendingAgeMs: null,
    ...overrides,
  }
}

function payrollInput(
  overrides: Partial<PayrollPressureInput> = {}
): PayrollPressureInput {
  return {
    pendingLockApprovalsCount: 0,
    oldestPendingAgeMs: null,
    ...overrides,
  }
}

function complianceInput(
  overrides: Partial<CompliancePressureInput> = {}
): CompliancePressureInput {
  return {
    submittedAwaitingCount: 0,
    oldestSubmittedAgeMs: null,
    failedCount: 0,
    ...overrides,
  }
}

function benefitsInput(
  overrides: Partial<BenefitsPressureInput> = {}
): BenefitsPressureInput {
  return {
    pendingEnrollmentCount: 0,
    ...overrides,
  }
}

describe("deriveHrmLeavePressure", () => {
  it("returns null when no leave approvals are pending (conditional density)", () => {
    expect(
      deriveHrmLeavePressure(
        leaveInput({ pendingApprovalsCount: 0, oldestPendingAgeMs: null })
      )
    ).toBeNull()
  })

  it("returns attention when an approval is pending but fresh", () => {
    expect(
      deriveHrmLeavePressure(
        leaveInput({
          pendingApprovalsCount: 2,
          oldestPendingAgeMs: LEAVE_CRITICAL_BOUNDARY_MS - 1,
        })
      )
    ).toEqual({ count: 2, tone: "attention" })
  })

  it("escalates to critical exactly at the SLA boundary", () => {
    expect(
      deriveHrmLeavePressure(
        leaveInput({
          pendingApprovalsCount: 1,
          oldestPendingAgeMs: LEAVE_CRITICAL_BOUNDARY_MS,
        })
      )
    ).toEqual({ count: 1, tone: "critical" })
  })

  it("treats a missing oldestPendingAgeMs as fresh when count > 0", () => {
    expect(
      deriveHrmLeavePressure(
        leaveInput({ pendingApprovalsCount: 1, oldestPendingAgeMs: null })
      )
    ).toEqual({ count: 1, tone: "attention" })
  })
})

describe("deriveHrmPayrollPressure", () => {
  it("returns null when no payroll-lock approvals are pending", () => {
    expect(deriveHrmPayrollPressure(payrollInput())).toBeNull()
  })

  it("returns attention when a lock approval is pending within SLA", () => {
    expect(
      deriveHrmPayrollPressure(
        payrollInput({
          pendingLockApprovalsCount: 1,
          oldestPendingAgeMs: PAYROLL_LOCK_CRITICAL_BOUNDARY_MS - 1,
        })
      )
    ).toEqual({ count: 1, tone: "attention" })
  })

  it("escalates to critical at the payroll-lock SLA boundary", () => {
    expect(
      deriveHrmPayrollPressure(
        payrollInput({
          pendingLockApprovalsCount: 3,
          oldestPendingAgeMs: PAYROLL_LOCK_CRITICAL_BOUNDARY_MS,
        })
      )
    ).toEqual({ count: 3, tone: "critical" })
  })
})

describe("deriveHrmCompliancePressure", () => {
  it("returns null when no rows are submitted-waiting or failed", () => {
    expect(deriveHrmCompliancePressure(complianceInput())).toBeNull()
  })

  it("returns attention when only fresh submitted-waiting rows exist", () => {
    expect(
      deriveHrmCompliancePressure(
        complianceInput({
          submittedAwaitingCount: 4,
          oldestSubmittedAgeMs: COMPLIANCE_SUBMITTED_CRITICAL_BOUNDARY_MS - 1,
        })
      )
    ).toEqual({ count: 4, tone: "attention" })
  })

  it("escalates to critical when a submitted row crosses the bureau-receipt SLA", () => {
    expect(
      deriveHrmCompliancePressure(
        complianceInput({
          submittedAwaitingCount: 2,
          oldestSubmittedAgeMs: COMPLIANCE_SUBMITTED_CRITICAL_BOUNDARY_MS,
        })
      )
    ).toEqual({ count: 2, tone: "critical" })
  })

  it("returns critical on any failed evidence regardless of age", () => {
    expect(
      deriveHrmCompliancePressure(
        complianceInput({
          submittedAwaitingCount: 0,
          oldestSubmittedAgeMs: null,
          failedCount: 1,
        })
      )
    ).toEqual({ count: 1, tone: "critical" })
  })

  it("sums submitted-waiting and failed counts when both present", () => {
    expect(
      deriveHrmCompliancePressure(
        complianceInput({
          submittedAwaitingCount: 3,
          oldestSubmittedAgeMs: 1000,
          failedCount: 2,
        })
      )
    ).toEqual({ count: 5, tone: "critical" })
  })
})

describe("deriveHrmBenefitsPressure", () => {
  it("returns null when there are no pending enrollments", () => {
    expect(deriveHrmBenefitsPressure(benefitsInput())).toBeNull()
  })

  it("returns attention below the critical backlog threshold", () => {
    expect(
      deriveHrmBenefitsPressure(
        benefitsInput({
          pendingEnrollmentCount:
            HRM_RAIL_PRESSURE_THRESHOLDS.benefitsPendingCriticalCount - 1,
        })
      )
    ).toEqual({
      count: HRM_RAIL_PRESSURE_THRESHOLDS.benefitsPendingCriticalCount - 1,
      tone: "attention",
    })
  })

  it("escalates to critical at the configured backlog threshold", () => {
    expect(
      deriveHrmBenefitsPressure(
        benefitsInput({
          pendingEnrollmentCount:
            HRM_RAIL_PRESSURE_THRESHOLDS.benefitsPendingCriticalCount,
        })
      )
    ).toEqual({
      count: HRM_RAIL_PRESSURE_THRESHOLDS.benefitsPendingCriticalCount,
      tone: "critical",
    })
  })
})
