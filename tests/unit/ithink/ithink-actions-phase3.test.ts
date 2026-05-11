import { beforeEach, describe, expect, it, vi } from "vitest"

import { completeIThink } from "#features/ithink/actions/complete-ithink"
import { reopenIThink } from "#features/ithink/actions/reopen-ithink"
import { resolveIThink } from "#features/ithink/actions/resolve-ithink"
import type { IThinkRow } from "#features/ithink/types"
import type { Prediction } from "#features/onething"
import { db } from "#lib/db"
import { requireOrgSession } from "#lib/tenant"

const ORG = "00000000-0000-4000-8000-0000000000cc"
const TASK = "00000000-0000-4000-8000-0000000000dd"

const hoisted = vi.hoisted(() => ({
  getIThinkById: vi.fn(),
  revalidateOrgIThinkDashboard: vi.fn(),
  appendOneThingOneThingAudit7w1h: vi.fn(),
  updateOneThingState: vi.fn(),
  emitOneThingOrgWebhook: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn(),
  enqueueOneThingRecurrenceWorkflowRun: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("#features/ithink/data/ithink-revalidate.server", () => ({
  revalidateOrgIThinkDashboard: hoisted.revalidateOrgIThinkDashboard,
}))

vi.mock("#features/ithink/data/ithink.queries.server", () => ({
  getIThinkById: hoisted.getIThinkById,
}))

vi.mock("#features/onething/server", () => ({
  appendOneThingOneThingAudit7w1h: hoisted.appendOneThingOneThingAudit7w1h,
  updateOneThingState: hoisted.updateOneThingState,
  emitOneThingOrgWebhook: hoisted.emitOneThingOrgWebhook,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: hoisted.writeIamAuditEventFromNextHeaders,
}))

vi.mock("#lib/tenant", () => ({
  requireOrgSession: vi.fn(),
}))

vi.mock("#features/execution", () => ({
  enqueueOneThingRecurrenceWorkflowRun:
    hoisted.enqueueOneThingRecurrenceWorkflowRun,
}))

vi.mock("next/cache", () => ({
  refresh: hoisted.refresh,
}))

vi.mock("#lib/db", () => ({
  db: {
    update: vi.fn(),
  },
}))

function baseRow(overrides: Partial<IThinkRow> = {}): IThinkRow {
  return {
    id: TASK,
    listId: "00000000-0000-4000-8000-0000000000bb",
    title: "Situation on record",
    consequence: "If ignored, revenue recognition slips.",
    state: "detected",
    severity: "medium",
    dueAt: null,
    snoozeUntil: null,
    assigneeUserId: null,
    recurrenceRule: null,
    position: 0,
    createdAt: new Date("2026-05-01T12:00:00.000Z"),
    updatedAt: new Date("2026-05-01T12:00:00.000Z"),
    linkage: null,
    counterparty: null,
    provenance: null,
    impact: null,
    temporalPast: null,
    temporalNow: null,
    temporalNext: null,
    resolvedAt: null,
    deprecatedAt: null,
    resolutionNote: null,
    resolutionProof: null,
    predictions: null,
    audit7w1h: null,
    parentOneThingId: null,
    ...overrides,
  }
}

function orgSession() {
  return {
    organizationId: ORG,
    userId: "00000000-0000-4000-8000-0000000000ee",
    sessionId: "sess-phase3",
    user: {
      email: "op@example.com",
      name: null,
      role: "member" as const,
    },
  }
}

describe("iThink Phase 3 — resolveIThink", () => {
  beforeEach(() => {
    vi.mocked(requireOrgSession).mockResolvedValue(orgSession())
    hoisted.getIThinkById.mockReset()
    hoisted.revalidateOrgIThinkDashboard.mockReset()
    hoisted.appendOneThingOneThingAudit7w1h.mockReset()
    hoisted.refresh.mockReset()
    vi.mocked(db.update).mockReset()

    hoisted.appendOneThingOneThingAudit7w1h.mockResolvedValue({ trimmed: [] })

    const where = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn().mockReturnValue({ where })
    vi.mocked(db.update).mockReturnValue({ set } as never)
  })

  it("returns dod_failed and does not update when resolve severity requires a note and note is empty", async () => {
    // DB `medium` maps to resolve severity `low` in `inferResolveSeverityFromSignals`;
    // `high` requires a non-empty trimmed resolution note (DoD owner decision).
    hoisted.getIThinkById.mockResolvedValue(
      baseRow({ state: "detected", severity: "high" })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)
    fd.set("resolutionNote", "   ")
    fd.set("resolutionProofJson", "")

    const result = await resolveIThink(fd)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "dod_failed",
        checks: expect.objectContaining({ ownerDecisionRecorded: false }),
      })
    )
    expect(vi.mocked(db.update)).not.toHaveBeenCalled()
    expect(hoisted.appendOneThingOneThingAudit7w1h).not.toHaveBeenCalled()
    expect(hoisted.revalidateOrgIThinkDashboard).not.toHaveBeenCalled()
  })

  it("returns bad_transition when deprecated cannot move to resolved", async () => {
    hoisted.getIThinkById.mockResolvedValue(
      baseRow({ state: "deprecated", severity: "low" })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)
    fd.set("resolutionNote", "Closing loop")
    fd.set("resolutionProofJson", "")

    const result = await resolveIThink(fd)

    expect(result).toEqual(
      expect.objectContaining({ ok: false, code: "bad_transition" })
    )
    expect(vi.mocked(db.update)).not.toHaveBeenCalled()
  })

  it("resolves with valid note and writes erp.ithink.consequence.resolve audit + revalidates", async () => {
    hoisted.getIThinkById.mockResolvedValue(
      baseRow({ state: "detected", severity: "high" })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)
    fd.set("resolutionNote", "Approved after controller sign-off.")
    fd.set(
      "resolutionProofJson",
      JSON.stringify([{ type: "doc", ref: "SIG-1" }])
    )

    const result = await resolveIThink(fd)

    expect(result).toEqual({ ok: true })
    expect(vi.mocked(db.update)).toHaveBeenCalled()
    const setCall = vi.mocked(db.update).mock.results[0]?.value.set.mock
      .calls[0]?.[0] as Record<string, unknown>
    expect(setCall?.state).toBe("resolved")
    expect(hoisted.appendOneThingOneThingAudit7w1h).toHaveBeenCalledTimes(1)
    const auditArg = hoisted.appendOneThingOneThingAudit7w1h.mock.calls[0]?.[2]
    expect(auditArg?.event?.action).toBe("erp.ithink.consequence.resolve")
    expect(hoisted.revalidateOrgIThinkDashboard).toHaveBeenCalledTimes(1)
    expect(hoisted.refresh).toHaveBeenCalledTimes(1)
  })

  it("applies markPredictionsClearedForResolve to persisted predictions on success", async () => {
    const predictions: Prediction[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        generatedBy: "ranker",
        generatedAt: "2026-05-01T12:00:00.000Z",
        claim: "Risk note",
        severity: "low",
      },
    ]
    hoisted.getIThinkById.mockResolvedValue(
      baseRow({ state: "detected", severity: "medium", predictions })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)
    fd.set("resolutionNote", "Handled with sign-off.")
    fd.set("resolutionProofJson", "")

    await resolveIThink(fd)

    const setCall = vi.mocked(db.update).mock.results[0]?.value.set.mock
      .calls[0]?.[0] as { predictions: Prediction[] }
    expect(Array.isArray(setCall?.predictions)).toBe(true)
    expect(setCall?.predictions?.every((p) => Boolean(p.clearedAt))).toBe(true)
  })
})

describe("iThink Phase 3 — reopenIThink", () => {
  beforeEach(() => {
    vi.mocked(requireOrgSession).mockResolvedValue(orgSession())
    hoisted.getIThinkById.mockReset()
    hoisted.updateOneThingState.mockReset()
    hoisted.writeIamAuditEventFromNextHeaders.mockReset()
    hoisted.emitOneThingOrgWebhook.mockReset()
    hoisted.revalidateOrgIThinkDashboard.mockReset()
    hoisted.refresh.mockReset()
  })

  it("moves deprecated → detected and audits erp.ithink.consequence.reopen", async () => {
    hoisted.getIThinkById.mockResolvedValue(baseRow({ state: "deprecated" }))

    const fd = new FormData()
    fd.set("oneThingId", TASK)

    await reopenIThink(fd)

    expect(hoisted.updateOneThingState).toHaveBeenCalledWith(TASK, {
      state: "detected",
      snoozeUntil: null,
    })
    expect(hoisted.writeIamAuditEventFromNextHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "erp.ithink.consequence.reopen",
        resourceId: TASK,
        organizationId: ORG,
      })
    )
    expect(hoisted.revalidateOrgIThinkDashboard).toHaveBeenCalledTimes(1)
  })

  const nonDeprecatedStates = [
    "resolved",
    "completed",
    "owned",
    "detected",
    "blocked",
  ] as const

  it.each(nonDeprecatedStates)(
    "no-ops from state %s — no state update or reopen audit",
    async (state) => {
      hoisted.getIThinkById.mockResolvedValue(baseRow({ state }))

      const fd = new FormData()
      fd.set("oneThingId", TASK)

      await reopenIThink(fd)

      expect(hoisted.updateOneThingState).not.toHaveBeenCalled()
      expect(hoisted.writeIamAuditEventFromNextHeaders).not.toHaveBeenCalled()
    }
  )
})

describe("iThink Phase 3 — completeIThink", () => {
  beforeEach(() => {
    vi.mocked(requireOrgSession).mockResolvedValue(orgSession())
    hoisted.getIThinkById.mockReset()
    hoisted.updateOneThingState.mockReset()
    hoisted.writeIamAuditEventFromNextHeaders.mockReset()
    hoisted.emitOneThingOrgWebhook.mockReset()
    hoisted.enqueueOneThingRecurrenceWorkflowRun.mockReset()
    hoisted.revalidateOrgIThinkDashboard.mockReset()
    hoisted.refresh.mockReset()
  })

  it("writes erp.ithink.consequence.complete and does not enqueue recurrence when rule is empty", async () => {
    hoisted.getIThinkById.mockResolvedValue(
      baseRow({ recurrenceRule: null, state: "detected" })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)

    await completeIThink(fd)

    expect(hoisted.updateOneThingState).toHaveBeenCalledWith(TASK, {
      state: "resolved",
      snoozeUntil: null,
    })
    expect(hoisted.writeIamAuditEventFromNextHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "erp.ithink.consequence.complete",
        resourceId: TASK,
      })
    )
    expect(hoisted.enqueueOneThingRecurrenceWorkflowRun).not.toHaveBeenCalled()
  })

  it("enqueues recurrence workflow when recurrenceRule is set", async () => {
    const session = orgSession()
    vi.mocked(requireOrgSession).mockResolvedValue(session)

    hoisted.getIThinkById.mockResolvedValue(
      baseRow({
        state: "detected",
        recurrenceRule: "FREQ=DAILY;COUNT=5",
      })
    )

    const fd = new FormData()
    fd.set("oneThingId", TASK)

    await completeIThink(fd)

    expect(hoisted.enqueueOneThingRecurrenceWorkflowRun).toHaveBeenCalledWith({
      organizationId: ORG,
      resolvedOneThingId: TASK,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
    })
  })
})
