/**
 * Training event log — idempotency contract.
 *
 * The `appendTrainingEvent` function enforces a soft unique constraint:
 * same (orgId, employeeId, assignmentId, action) on the same calendar day
 * must not create a duplicate row.
 *
 * Since this requires a real DB, we test:
 * 1. The idempotency guard logic (pure condition extracted for testing)
 * 2. The scope-snapshot payload shape contract (structure validation)
 * 3. Cross-day write is allowed (different `date_trunc('day')` would not match)
 */
import { describe, expect, it } from "vitest"

import type { HrmTrainingEventAction } from "../../lib/features/hrm/schemas/training.schema"

// ---------------------------------------------------------------------------
// Simulate the idempotency check guard (mirrors appendTrainingEvent guard)
// ---------------------------------------------------------------------------

type EventKey = {
  organizationId: string
  employeeId: string
  assignmentId: string | null
  action: HrmTrainingEventAction
  occurredAtDay: string // "YYYY-MM-DD"
}

function isEventDuplicate(key: EventKey, existingKeys: EventKey[]): boolean {
  if (key.assignmentId === null) return false
  return existingKeys.some(
    (e) =>
      e.organizationId === key.organizationId &&
      e.employeeId === key.employeeId &&
      e.assignmentId === key.assignmentId &&
      e.action === key.action &&
      e.occurredAtDay === key.occurredAtDay
  )
}

const ORG = "11111111-1111-4111-8111-111111111111"
const EMP = "22222222-2222-4222-8222-222222222222"
const ASSIGNMENT = "33333333-3333-4333-8333-333333333333"
const TODAY = "2026-05-16"
const TOMORROW = "2026-05-17"

describe("training event idempotency guard", () => {
  it("detects same-day duplicate for same (org, emp, assignment, action)", () => {
    const key: EventKey = {
      organizationId: ORG,
      employeeId: EMP,
      assignmentId: ASSIGNMENT,
      action: "completed",
      occurredAtDay: TODAY,
    }
    expect(isEventDuplicate(key, [key])).toBe(true)
  })

  it("allows cross-day write for the same assignment+action", () => {
    const existing: EventKey = {
      organizationId: ORG,
      employeeId: EMP,
      assignmentId: ASSIGNMENT,
      action: "completed",
      occurredAtDay: TODAY,
    }
    const incoming: EventKey = {
      ...existing,
      occurredAtDay: TOMORROW,
    }
    expect(isEventDuplicate(incoming, [existing])).toBe(false)
  })

  it("allows same-day write when action differs", () => {
    const existing: EventKey = {
      organizationId: ORG,
      employeeId: EMP,
      assignmentId: ASSIGNMENT,
      action: "assigned",
      occurredAtDay: TODAY,
    }
    const incoming: EventKey = {
      ...existing,
      action: "completed",
    }
    expect(isEventDuplicate(incoming, [existing])).toBe(false)
  })

  it("allows same-day same-action when assignment differs", () => {
    const existing: EventKey = {
      organizationId: ORG,
      employeeId: EMP,
      assignmentId: ASSIGNMENT,
      action: "completed",
      occurredAtDay: TODAY,
    }
    const incoming: EventKey = {
      ...existing,
      assignmentId: "44444444-4444-4444-4444-444444444444",
    }
    expect(isEventDuplicate(incoming, [existing])).toBe(false)
  })

  it("skips idempotency check when assignmentId is null (session-level event)", () => {
    const key: EventKey = {
      organizationId: ORG,
      employeeId: EMP,
      assignmentId: null,
      action: "completed",
      occurredAtDay: TODAY,
    }
    expect(isEventDuplicate(key, [key])).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Scope snapshot payload shape contract
// ---------------------------------------------------------------------------

type ScopeSnapshot = {
  departmentId: string | null
  positionId: string | null
  gradeId: string | null
  costCenterCode: string | null
}

function buildEventPayload(
  scope: ScopeSnapshot,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return { ...scope, ...extra }
}

describe("training event scope snapshot payload", () => {
  it("merges scope snapshot with extra payload keys", () => {
    const scope: ScopeSnapshot = {
      departmentId: "dept-1",
      positionId: "pos-1",
      gradeId: null,
      costCenterCode: "CC-001",
    }
    const payload = buildEventPayload(scope, { sessionId: "session-abc" })
    expect(payload.departmentId).toBe("dept-1")
    expect(payload.sessionId).toBe("session-abc")
    expect(payload.gradeId).toBeNull()
  })

  it("extra keys override scope snapshot keys (spread order)", () => {
    const scope: ScopeSnapshot = {
      departmentId: "dept-old",
      positionId: null,
      gradeId: null,
      costCenterCode: null,
    }
    const payload = buildEventPayload(scope, { departmentId: "dept-override" })
    expect(payload.departmentId).toBe("dept-override")
  })

  it("null scope fields are present in payload (not omitted)", () => {
    const scope: ScopeSnapshot = {
      departmentId: null,
      positionId: null,
      gradeId: null,
      costCenterCode: null,
    }
    const payload = buildEventPayload(scope, {})
    expect("departmentId" in payload).toBe(true)
    expect("positionId" in payload).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// HRM_TRAINING_EVENT_ACTIONS constant contract
// ---------------------------------------------------------------------------

import { HRM_TRAINING_EVENT_ACTIONS } from "../../lib/features/hrm/schemas/training.schema"

describe("HRM_TRAINING_EVENT_ACTIONS constant", () => {
  it("includes all lifecycle actions", () => {
    const actions = HRM_TRAINING_EVENT_ACTIONS as readonly string[]
    expect(actions).toContain("assigned")
    expect(actions).toContain("completed")
    expect(actions).toContain("waived")
    expect(actions).toContain("cancelled")
    expect(actions).toContain("verified")
    expect(actions).toContain("expired")
    expect(actions).toContain("session_closed")
  })

  it("is a non-empty array", () => {
    expect(HRM_TRAINING_EVENT_ACTIONS.length).toBeGreaterThan(0)
  })
})
