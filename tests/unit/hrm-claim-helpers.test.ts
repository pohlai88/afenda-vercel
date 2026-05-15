/**
 * Unit tests for Phase 4 claim pure helpers.
 *
 * Covers `applyPerClaimLimit`, `isClaimDateInRange`, `computeClaimsSummary`,
 * `buildClaimApprovalSnapshot`, and the state-machine guards. All assertions
 * are pure — no DB, no async, no `server-only` imports.
 */
import { describe, expect, it } from "vitest"

import {
  applyPerClaimLimit,
  buildClaimApprovalSnapshot,
  buildClaimNumber,
  buildClaimPolicySnapshot,
  canTransitionFromApproved,
  canTransitionFromSubmitted,
  CLAIM_EVIDENCE_TYPES,
  CLAIM_STATES,
  computeClaimsSummary,
  doesClaimRequireEvidence,
  isClaimCancellable,
  isClaimDateInRange,
  isClaimEvidenceType,
  isClaimState,
} from "../../lib/features/hrm/data/claim-helpers.shared"

describe("CLAIM_STATES / CLAIM_EVIDENCE_TYPES", () => {
  it("freezes the canonical claim states list", () => {
    expect(CLAIM_STATES).toEqual([
      "draft",
      "submitted",
      "approved",
      "rejected",
      "cancelled",
      "paid",
    ])
  })

  it("freezes the canonical evidence types list", () => {
    expect(CLAIM_EVIDENCE_TYPES).toEqual([
      "receipt",
      "invoice",
      "photo",
      "other",
    ])
  })

  it("isClaimState narrows valid + rejects invalid", () => {
    expect(isClaimState("submitted")).toBe(true)
    expect(isClaimState("paid")).toBe(true)
    expect(isClaimState("invented")).toBe(false)
    expect(isClaimState("")).toBe(false)
  })

  it("isClaimEvidenceType narrows valid + rejects invalid", () => {
    expect(isClaimEvidenceType("receipt")).toBe(true)
    expect(isClaimEvidenceType("other")).toBe(true)
    expect(isClaimEvidenceType("invoice2")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// applyPerClaimLimit
// ---------------------------------------------------------------------------

describe("applyPerClaimLimit", () => {
  it("returns ok when amount > 0 and no limit is configured", () => {
    expect(applyPerClaimLimit(120, null)).toEqual({ ok: true })
    expect(applyPerClaimLimit(120, undefined)).toEqual({ ok: true })
    expect(applyPerClaimLimit(120, 0)).toEqual({ ok: true })
  })

  it("returns ok when amount is exactly at the limit", () => {
    expect(applyPerClaimLimit(500, 500)).toEqual({ ok: true })
  })

  it("returns ok when amount is below the limit", () => {
    expect(applyPerClaimLimit(123.45, 500)).toEqual({ ok: true })
  })

  it("rejects when amount exceeds the limit", () => {
    expect(applyPerClaimLimit(500.01, 500)).toMatchObject({
      ok: false,
      reason: "over_limit",
      amount: 500.01,
      limit: 500,
    })
  })

  it("rejects zero / negative amounts even with no limit", () => {
    expect(applyPerClaimLimit(0, null)).toMatchObject({ ok: false })
    expect(applyPerClaimLimit(-1, 500)).toMatchObject({ ok: false })
  })

  it("rejects NaN / Infinity defensively", () => {
    expect(applyPerClaimLimit(Number.NaN, 500)).toMatchObject({ ok: false })
    expect(applyPerClaimLimit(Number.POSITIVE_INFINITY, 500)).toMatchObject({
      ok: false,
    })
  })
})

// ---------------------------------------------------------------------------
// isClaimDateInRange
// ---------------------------------------------------------------------------

describe("isClaimDateInRange", () => {
  it("accepts today as the latest allowed claim date", () => {
    expect(isClaimDateInRange("2026-05-12", "2026-05-12")).toBe(true)
  })

  it("rejects future claim dates", () => {
    expect(isClaimDateInRange("2026-05-13", "2026-05-12")).toBe(false)
  })

  it("accepts past claim dates", () => {
    expect(isClaimDateInRange("2025-12-31", "2026-05-12")).toBe(true)
  })

  it("respects optional notBefore window", () => {
    expect(
      isClaimDateInRange("2026-04-30", "2026-05-12", {
        notBefore: "2026-05-01",
      })
    ).toBe(false)
    expect(
      isClaimDateInRange("2026-05-01", "2026-05-12", {
        notBefore: "2026-05-01",
      })
    ).toBe(true)
  })

  it("respects optional notAfter window", () => {
    expect(
      isClaimDateInRange("2026-05-15", "2026-05-30", { notAfter: "2026-05-12" })
    ).toBe(false)
  })

  it("rejects malformed claim dates", () => {
    expect(isClaimDateInRange("12/05/2026", "2026-05-12")).toBe(false)
    expect(isClaimDateInRange("", "2026-05-12")).toBe(false)
  })

  it("rejects malformed today references", () => {
    expect(isClaimDateInRange("2026-05-10", "")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// computeClaimsSummary
// ---------------------------------------------------------------------------

describe("computeClaimsSummary", () => {
  it("returns empty summary when there are no claims", () => {
    const summary = computeClaimsSummary([])
    expect(summary).toEqual({
      submittedCount: 0,
      approvedUnpaidCount: 0,
      rejectedRecentCount: 0,
      draftCount: 0,
      totalCount: 0,
    })
  })

  it("counts submitted claims", () => {
    const summary = computeClaimsSummary([
      { state: "submitted", paidByPayrollLineId: null },
      { state: "submitted", paidByPayrollLineId: null },
    ])
    expect(summary.submittedCount).toBe(2)
    expect(summary.approvedUnpaidCount).toBe(0)
    expect(summary.totalCount).toBe(2)
  })

  it("counts approved claims as unpaid only when paidByPayrollLineId is null", () => {
    const summary = computeClaimsSummary([
      { state: "approved", paidByPayrollLineId: null }, // unpaid
      { state: "approved", paidByPayrollLineId: "pl-1" }, // paid by payroll
      { state: "approved", paidByPayrollLineId: null }, // unpaid
    ])
    expect(summary.approvedUnpaidCount).toBe(2)
  })

  it("counts rejected and draft claims separately", () => {
    const summary = computeClaimsSummary([
      { state: "rejected", paidByPayrollLineId: null },
      { state: "draft", paidByPayrollLineId: null },
      { state: "draft", paidByPayrollLineId: null },
    ])
    expect(summary.rejectedRecentCount).toBe(1)
    expect(summary.draftCount).toBe(2)
  })

  it("ignores cancelled and paid claims for pressure counts", () => {
    const summary = computeClaimsSummary([
      { state: "cancelled", paidByPayrollLineId: null },
      { state: "paid", paidByPayrollLineId: "pl-1" },
    ])
    expect(summary.submittedCount).toBe(0)
    expect(summary.approvedUnpaidCount).toBe(0)
    expect(summary.rejectedRecentCount).toBe(0)
    expect(summary.draftCount).toBe(0)
    expect(summary.totalCount).toBe(2)
  })

  it("totalCount reflects every input regardless of state", () => {
    const summary = computeClaimsSummary([
      { state: "submitted", paidByPayrollLineId: null },
      { state: "approved", paidByPayrollLineId: null },
      { state: "approved", paidByPayrollLineId: "pl-1" },
      { state: "rejected", paidByPayrollLineId: null },
      { state: "cancelled", paidByPayrollLineId: null },
      { state: "paid", paidByPayrollLineId: "pl-2" },
    ])
    expect(summary.totalCount).toBe(6)
    expect(summary.submittedCount).toBe(1)
    expect(summary.approvedUnpaidCount).toBe(1)
    expect(summary.rejectedRecentCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// buildClaimApprovalSnapshot
// ---------------------------------------------------------------------------

describe("buildClaimApprovalSnapshot", () => {
  const baseInput = {
    employeeId: "emp-1",
    employeeNumber: "MY-00042",
    employeeFullName: "Aminah Binti Rahman",
    claimTypeId: "ct-travel",
    claimTypeCode: "TRAVEL",
    claimTypeName: "Travel reimbursement",
    defaultPayrollLineCode: "ALLOWANCE_TRAVEL",
    perClaimLimit: 500,
    claimDate: "2026-05-10",
    amount: 123.45,
    currency: "MYR",
    description: "Petrol receipt for client visit",
    evidenceCount: 1,
    evidenceRequired: true,
    payoutMethod: "payroll",
    financeAccountCode: "payroll.claims_expense",
    costCenterCode: "OPS",
    taxTreatment: "non_taxable_reimbursement",
    policyVersion: "MY-2026-01",
    requestedAt: new Date("2026-05-11T10:00:00.000Z"),
  }

  it("stamps objectType = 'claim'", () => {
    const snap = buildClaimApprovalSnapshot(baseInput)
    expect(snap.objectType).toBe("claim")
  })

  it("preserves identity, claim type, and amount fields", () => {
    const snap = buildClaimApprovalSnapshot(baseInput)
    expect(snap.employeeId).toBe("emp-1")
    expect(snap.employeeNumber).toBe("MY-00042")
    expect(snap.employeeFullName).toBe("Aminah Binti Rahman")
    expect(snap.claimTypeCode).toBe("TRAVEL")
    expect(snap.amount).toBe(123.45)
    expect(snap.currency).toBe("MYR")
    expect(snap.perClaimLimit).toBe(500)
    expect(snap.evidenceCount).toBe(1)
    expect(snap.evidenceRequired).toBe(true)
    expect(snap.payoutMethod).toBe("payroll")
    expect(snap.defaultPayrollLineCode).toBe("ALLOWANCE_TRAVEL")
  })

  it("serializes requestedAt as ISO string", () => {
    const snap = buildClaimApprovalSnapshot(baseInput)
    expect(snap.requestedAt).toBe("2026-05-11T10:00:00.000Z")
  })

  it("handles null employeeNumber + null description + null perClaimLimit", () => {
    const snap = buildClaimApprovalSnapshot({
      ...baseInput,
      employeeNumber: null,
      description: null,
      perClaimLimit: null,
    })
    expect(snap.employeeNumber).toBeNull()
    expect(snap.description).toBeNull()
    expect(snap.perClaimLimit).toBeNull()
  })

  it("snapshot serializes deterministically (used as the approval record)", () => {
    const snap1 = buildClaimApprovalSnapshot(baseInput)
    const snap2 = buildClaimApprovalSnapshot(baseInput)
    expect(JSON.stringify(snap1)).toBe(JSON.stringify(snap2))
  })
})

describe("claim policy metadata", () => {
  it("requires evidence when the claim type requires all evidence", () => {
    expect(
      doesClaimRequireEvidence({
        amount: 10,
        requiresEvidence: true,
        evidenceRequiredAboveAmount: null,
      })
    ).toBe(true)
  })

  it("requires evidence when amount crosses the threshold", () => {
    expect(
      doesClaimRequireEvidence({
        amount: 250,
        requiresEvidence: false,
        evidenceRequiredAboveAmount: 200,
      })
    ).toBe(true)
  })

  it("builds a deterministic claim policy snapshot", () => {
    const snapshot = buildClaimPolicySnapshot({
      perClaimLimit: 500,
      periodLimit: 1000,
      annualLimit: 5000,
      requiresEvidence: false,
      evidenceRequiredAboveAmount: 200,
      amount: 250,
      payoutMethod: "payroll",
      financeAccountCode: "payroll.claims_expense",
      costCenterCode: "OPS",
      taxTreatment: "non_taxable_reimbursement",
      evaluatedAt: new Date("2026-05-11T10:00:00.000Z"),
    })

    expect(snapshot).toMatchObject({
      perClaimLimit: 500,
      periodLimit: 1000,
      annualLimit: 5000,
      evidenceRequired: true,
      payoutMethod: "payroll",
      financeAccountCode: "payroll.claims_expense",
    })
    expect(snapshot.evaluatedAt).toBe("2026-05-11T10:00:00.000Z")
  })

  it("builds a stable human claim reference from date and id", () => {
    expect(
      buildClaimNumber({
        claimDate: "2026-05-10",
        claimId: "12345678-1234-4234-9234-123456789abc",
      })
    ).toBe("CLM-20260510-1234567812")
  })
})

// ---------------------------------------------------------------------------
// State machine guards
// ---------------------------------------------------------------------------

describe("claim state machine guards", () => {
  it("submitted -> approved | rejected | cancelled", () => {
    expect(canTransitionFromSubmitted("approved")).toBe(true)
    expect(canTransitionFromSubmitted("rejected")).toBe(true)
    expect(canTransitionFromSubmitted("cancelled")).toBe(true)
    expect(canTransitionFromSubmitted("draft")).toBe(false)
    expect(canTransitionFromSubmitted("paid")).toBe(false)
    expect(canTransitionFromSubmitted("submitted")).toBe(false)
  })

  it("approved -> paid | cancelled", () => {
    expect(canTransitionFromApproved("paid")).toBe(true)
    expect(canTransitionFromApproved("cancelled")).toBe(true)
    expect(canTransitionFromApproved("rejected")).toBe(false)
    expect(canTransitionFromApproved("draft")).toBe(false)
    expect(canTransitionFromApproved("submitted")).toBe(false)
    expect(canTransitionFromApproved("approved")).toBe(false)
  })

  it("isClaimCancellable accepts draft / submitted / approved only", () => {
    expect(isClaimCancellable("draft")).toBe(true)
    expect(isClaimCancellable("submitted")).toBe(true)
    expect(isClaimCancellable("approved")).toBe(true)
    expect(isClaimCancellable("paid")).toBe(false)
    expect(isClaimCancellable("rejected")).toBe(false)
    expect(isClaimCancellable("cancelled")).toBe(false)
  })
})
