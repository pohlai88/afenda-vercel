import { describe, expect, it } from "vitest"

import {
  CLAIM_KANBAN_COLUMN_IDS,
  CLAIM_KANBAN_COLUMN_TRANSITIONS,
} from "#features/hrm/payroll-compensation/expenses-reimbursement/data/claim-kanban-workflow.shared"
import { isKanbanTransitionAllowed } from "#features/governed-surface"
import { buildKanbanWorkflowFromColumnTransitions } from "#features/governed-surface"

describe("claim kanban workflow", () => {
  const workflow = buildKanbanWorkflowFromColumnTransitions(
    CLAIM_KANBAN_COLUMN_TRANSITIONS
  )

  it("exposes lifecycle columns without draft", () => {
    expect(CLAIM_KANBAN_COLUMN_IDS).not.toContain("draft")
    expect(CLAIM_KANBAN_COLUMN_IDS).toContain("submitted")
    expect(CLAIM_KANBAN_COLUMN_IDS).toContain("returned")
  })

  it("allows submitted to approve and returned to resubmit", () => {
    expect(isKanbanTransitionAllowed(workflow, "submitted", "approved")).toBe(
      true
    )
    expect(isKanbanTransitionAllowed(workflow, "returned", "submitted")).toBe(
      true
    )
    expect(isKanbanTransitionAllowed(workflow, "paid", "submitted")).toBe(false)
  })
})
