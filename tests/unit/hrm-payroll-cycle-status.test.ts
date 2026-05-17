import { describe, expect, it } from "vitest"

import {
  canFinalizePayrollPeriod,
  canLockPayrollPeriod,
  canRequestPayrollLock,
  isPayrollPeriodFinalized,
  isPayrollPeriodLocked,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-cycle-status.shared"

describe("payroll-cycle-status", () => {
  it("allows lock request only while preparing", () => {
    expect(canRequestPayrollLock("preparing")).toBe(true)
    expect(canRequestPayrollLock("open")).toBe(false)
    expect(canRequestPayrollLock("locked")).toBe(false)
  })

  it("allows lock only while preparing", () => {
    expect(canLockPayrollPeriod("preparing")).toBe(true)
    expect(canFinalizePayrollPeriod("preparing")).toBe(true)
    expect(canLockPayrollPeriod("computed")).toBe(false)
  })

  it("treats locked, finalized, and posted as locked/finalized", () => {
    expect(isPayrollPeriodLocked("locked")).toBe(true)
    expect(isPayrollPeriodLocked("finalized")).toBe(true)
    expect(isPayrollPeriodLocked("posted")).toBe(true)
    expect(isPayrollPeriodFinalized("locked")).toBe(true)
    expect(isPayrollPeriodFinalized("finalized")).toBe(true)
    expect(isPayrollPeriodLocked("open")).toBe(false)
  })
})
