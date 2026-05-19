import { describe, expect, it } from "vitest"

import { evaluateClaimEligibility } from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-eligibility.shared"
import {
  firstBlockingClaimEvidenceIssue,
  validateClaimEvidenceDocument,
} from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-evidence-validation.shared"
import {
  mergeClaimDuplicateSignals,
  scoreReceiptPayloadDuplicateSignals,
} from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/data/claim-duplicate.shared"
import { HRM_CLAIM_EVENT_TYPES } from "../../lib/features/hrm/payroll-compensation/expenses-reimbursement/expense-reimbursement.contract"
import {
  applyApClaimAccrualsToPostingPreview,
  buildPayrollPostingPreviewFromInputs,
} from "../../lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-close.shared"
import { ORG_EVENT_TYPES } from "../../lib/features/org-admin/constants"

describe("claim legal entity eligibility", () => {
  it("rejects when fund rules exclude employee legal entity", () => {
    const result = evaluateClaimEligibility({
      employee: {
        id: "emp-1",
        archivedAt: null,
        employmentStatus: "active",
        employmentType: "permanent",
        countryCode: "MY",
        legalEntityCode: "SG01",
        currentDepartmentId: "dept-1",
        currentJobGradeId: null,
        workStateCode: null,
      },
      claimTypeCode: "TRAVEL",
      rules: { allowedLegalEntityCodes: ["MY01"] },
      evaluatedAt: new Date("2026-05-12T00:00:00.000Z"),
    })

    expect(result.eligible).toBe(false)
    expect(
      result.reasons.some((r) => r.code === "legal_entity_not_allowed")
    ).toBe(true)
  })
})

describe("claim receipt evidence validation", () => {
  const baseDocument = {
    documentType: "expense_receipt",
    payloadHash: "abc123",
    blobUrl: "https://blob.example/receipt.pdf",
    documentLifecycleStatus: "active",
    verificationStatus: "pending",
    mimeType: "application/pdf",
    sizeBytes: 1024,
  } as const

  it("blocks receipt type mismatch", () => {
    const issues = validateClaimEvidenceDocument({
      evidenceType: "receipt",
      document: { ...baseDocument, documentType: "employment_contract" },
      duplicateReceiptOnOtherClaim: false,
    })
    const blocking = firstBlockingClaimEvidenceIssue(issues)
    expect(blocking?.code).toBe("receipt_type_mismatch")
  })

  it("blocks duplicate receipt payload on another claim", () => {
    const issues = validateClaimEvidenceDocument({
      evidenceType: "receipt",
      document: baseDocument,
      duplicateReceiptOnOtherClaim: true,
    })
    const blocking = firstBlockingClaimEvidenceIssue(issues)
    expect(blocking?.code).toBe("duplicate_receipt_payload")
  })
})

describe("claim org event subscriptions", () => {
  it("registers lifecycle and overdue claim events in ORG_EVENT_TYPES", () => {
    for (const type of Object.values(HRM_CLAIM_EVENT_TYPES)) {
      expect(ORG_EVENT_TYPES).toContain(type)
    }
  })
})

describe("claim receipt duplicate scoring at submit", () => {
  it("merges receipt hash signals with amount/date duplicates", () => {
    const receiptSignals = scoreReceiptPayloadDuplicateSignals({
      payloadHashes: ["hash-a"],
      matches: [
        {
          payloadHash: "hash-a",
          claimId: "claim-other",
          claimNumber: "CLM-001",
        },
      ],
    })
    const merged = mergeClaimDuplicateSignals(receiptSignals, [])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.signalKind).toBe("same_receipt_payload_hash")
    expect(merged[0]?.matchedClaimId).toBe("claim-other")
  })
})

describe("payroll close AP claim accruals", () => {
  it("extends posting preview with balanced AP accrual lines", () => {
    const base = buildPayrollPostingPreviewFromInputs({
      periodId: "period-1",
      currency: "MYR",
      runs: [],
      lines: [],
      inputHash: "test-hash",
    })
    const withAp = applyApClaimAccrualsToPostingPreview({
      preview: base,
      apClaimAccrualTotal: "150.00",
    })
    expect(withAp.isBalanced).toBe(true)
    expect(withAp.lines).toHaveLength(2)
    expect(withAp.totalDebits).toBe("150.00")
    expect(withAp.totalCredits).toBe("150.00")
  })

  it("leaves preview unchanged when AP accrual total is zero", () => {
    const base = buildPayrollPostingPreviewFromInputs({
      periodId: "period-1",
      currency: "MYR",
      runs: [],
      lines: [],
      inputHash: "test-hash",
    })
    const withAp = applyApClaimAccrualsToPostingPreview({
      preview: base,
      apClaimAccrualTotal: "0.00",
    })
    expect(withAp).toBe(base)
  })
})
