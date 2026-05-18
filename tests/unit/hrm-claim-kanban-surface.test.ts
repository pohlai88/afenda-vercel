import { describe, expect, it } from "vitest"

import { parseGovernedKanbanBoardConfiguration } from "#features/governed-surface/schemas/kanban-board.schema"
import {
  buildClaimKanbanConfiguration,
  buildClaimKanbanDragConfiguration,
} from "#features/hrm/payroll-compensation/expenses-reimbursement/data/claim-kanban-surface.server"
import { CLAIM_KANBAN_COLUMN_IDS } from "#features/hrm/payroll-compensation/expenses-reimbursement/data/claim-kanban-workflow.shared"
import type { ClaimRow } from "#features/hrm/payroll-compensation/expenses-reimbursement/data/claim.queries.server"

const COLUMN_LABELS = Object.fromEntries(
  CLAIM_KANBAN_COLUMN_IDS.map((id) => [id, id])
) as Record<(typeof CLAIM_KANBAN_COLUMN_IDS)[number], string>

const BASE_ROW = {
  id: "claim-1",
  claimNumber: "CLM-1",
  employeeId: "emp-1",
  employeeNumber: "E001",
  employeeFullName: "Aminah Rahman",
  claimTypeId: "type-1",
  claimTypeCode: "TRAVEL",
  claimTypeName: "Travel",
  claimDate: "2026-05-01",
  amount: "120.00",
  currency: "MYR",
  description: null,
  state: "submitted",
  submittedAt: new Date("2026-05-02"),
  submittedByUserId: "user-submit",
  decidedAt: null,
  decidedByUserId: null,
  rejectedReason: null,
  currentApprovalId: "approval-1",
  paidByPayrollLineId: null,
  paidAt: null,
  cancelledAt: null,
  requiresEvidence: false,
  policyEvidenceRequired: null,
  evidenceCount: 2,
  payoutMethod: "payroll",
  financeAccountCode: null,
  costCenterCode: null,
  projectCode: null,
  taxTreatment: "non_taxable",
  createdAt: new Date("2026-05-02"),
  updatedAt: new Date("2026-05-02"),
} as const satisfies ClaimRow

describe("buildClaimKanbanConfiguration", () => {
  it("parses footer-actions board with workflow and cards", () => {
    const config = buildClaimKanbanConfiguration([BASE_ROW], {
      boardAriaLabel: "Claims board",
      emptyColumn: "Empty",
      columnLabels: COLUMN_LABELS,
      evidenceCount: (count) => `${count} files`,
      underReview: "Under review",
    })

    const parsed = parseGovernedKanbanBoardConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.interactionMode).toBe("footer-actions")
    expect(parsed.data.requiresErpPermission).toEqual({
      module: "hrm",
      object: "claim",
      function: "read",
    })
    expect(parsed.data.columns).toHaveLength(CLAIM_KANBAN_COLUMN_IDS.length)
    expect(parsed.data.cards).toHaveLength(1)
    expect(parsed.data.cards[0]?.columnId).toBe("submitted")
    expect(parsed.data.cards[0]?.badges).toEqual(["2 files", "Under review"])
  })
})

describe("buildClaimKanbanDragConfiguration", () => {
  it("parses drag-reorder board with per-card transitions", () => {
    const config = buildClaimKanbanDragConfiguration(
      [{ ...BASE_ROW, state: "approved" }],
      {
        boardAriaLabel: "Claims board",
        emptyColumn: "Empty",
        columnLabels: COLUMN_LABELS,
        evidenceCount: (count) => `${count} files`,
        underReview: "Under review",
        dragHandleAriaLabel: "Move claim",
        cancelTransitionLabel: "Cancel",
        dragDisabledUseInbox: "Use inbox",
        dragDisabledNotCancellable: "Not cancellable",
      }
    )

    const parsed = parseGovernedKanbanBoardConfiguration(config)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.interactionMode).toBe("drag-reorder")
    expect(parsed.data.requiresErpPermission?.function).toBe("update")
    expect(parsed.data.copy?.dragHandleAriaLabel).toBe("Move claim")
    const cancelTransition = parsed.data.cards[0]?.availableTransitions?.find(
      (transition) => transition.transitionId === "approved->cancelled"
    )
    expect(cancelTransition?.state).toBe("ready")
  })
})
