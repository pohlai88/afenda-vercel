/**
 * Phase 3J — Shared `submitted -> acknowledged` transition.
 *
 * The transition function {@link acknowledgeEvidenceTransition} is the
 * SINGLE place where manual + webhook acknowledgement converge. These tests
 * lock the contract:
 *
 *   - state guard (only `submitted` succeeds; `draft`/`failed`/`queued`
 *     return `invalid_state`; `acknowledged` returns `already_acknowledged`)
 *   - missing evidence returns `not_found`
 *   - audit + mutation + provenance population happen atomically
 *   - idempotency does NOT emit a duplicate audit row
 *   - tri-state opts are honored (externalReference preserved on omit, set
 *     on supply; authorityPayloadHash recorded for webhook source)
 *
 * Mocks the db boundary only — the function's own logic runs untouched.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ComplianceEvidenceRow } from "../../lib/features/hrm/data/compliance.queries.server"
import type { UpdateComplianceSubmissionStateOpts } from "../../lib/features/hrm/data/compliance.mutations.server"

// ---------------------------------------------------------------------------
// Mock the db boundary BEFORE importing the SUT.
// ---------------------------------------------------------------------------

const mockGetEvidence =
  vi.fn<
    (
      organizationId: string,
      evidenceId: string
    ) => Promise<ComplianceEvidenceRow | null>
  >()
const mockUpdateState =
  vi.fn<
    (
      organizationId: string,
      evidenceId: string,
      submissionState: "queued" | "submitted" | "acknowledged" | "failed",
      opts?: UpdateComplianceSubmissionStateOpts
    ) => Promise<void>
  >()
const mockWriteAudit = vi.fn<(input: unknown) => Promise<void>>()

vi.mock(
  "../../lib/features/hrm/data/compliance.queries.server",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../lib/features/hrm/data/compliance.queries.server")
      >()
    return {
      ...actual,
      getComplianceEvidence: (organizationId: string, evidenceId: string) =>
        mockGetEvidence(organizationId, evidenceId),
    }
  }
)

vi.mock(
  "../../lib/features/hrm/data/compliance.mutations.server",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../lib/features/hrm/data/compliance.mutations.server")
      >()
    return {
      ...actual,
      updateComplianceSubmissionStateMutation: (
        ...args: Parameters<typeof mockUpdateState>
      ) => mockUpdateState(...args),
    }
  }
)

vi.mock("#lib/auth", async (importOriginal) => {
  const actual = (await importOriginal<Record<string, unknown>>()) ?? {}
  return {
    ...actual,
    writeIamAuditEvent: (input: unknown) => mockWriteAudit(input),
  }
})

// SUT must be imported AFTER mocks are declared.
const { acknowledgeEvidenceTransition } =
  await import("../../lib/features/hrm/data/compliance-acknowledgement.server")

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeEvidence(
  overrides: Partial<ComplianceEvidenceRow> = {}
): ComplianceEvidenceRow {
  return {
    id: "ev-1",
    organizationId: "org-1",
    periodId: "period-1",
    countryCode: "MY",
    packType: "epf_monthly",
    rulePackVersion: "my-2026.05",
    inputHash: "sha-input-1",
    outputHash: "sha-output-1",
    submissionState: "submitted",
    submissionDeliveryId: "delivery-1",
    externalReference: null,
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    acknowledgementSource: null,
    authorityPayloadHash: null,
    generatedAt: new Date("2026-05-01T00:00:00Z"),
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    createdByUserId: "user-creator",
    updatedByUserId: "user-creator",
    ...overrides,
  } as ComplianceEvidenceRow
}

beforeEach(() => {
  mockGetEvidence.mockReset()
  mockUpdateState.mockReset()
  mockWriteAudit.mockReset()
  mockUpdateState.mockResolvedValue(undefined)
  mockWriteAudit.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// State guard
// ---------------------------------------------------------------------------

describe("acknowledgeEvidenceTransition — state guard", () => {
  it("returns `not_found` when no evidence row exists", async () => {
    mockGetEvidence.mockResolvedValue(null)
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-missing",
      source: "manual",
      acknowledgedByUserId: "user-1",
    })
    expect(result.status).toBe("not_found")
    expect(mockUpdateState).not.toHaveBeenCalled()
    expect(mockWriteAudit).not.toHaveBeenCalled()
  })

  it("returns `already_acknowledged` when the row is already in terminal state", async () => {
    const acknowledgedAt = new Date("2026-05-10T03:00:00Z")
    mockGetEvidence.mockResolvedValue(
      makeEvidence({
        submissionState: "acknowledged",
        acknowledgedAt,
        acknowledgementSource: "webhook",
        externalReference: "EPF-2026-00001",
        authorityPayloadHash: "abc123def456",
      })
    )
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-1",
      source: "manual",
      acknowledgedByUserId: "user-1",
    })
    expect(result.status).toBe("already_acknowledged")
    if (result.status === "already_acknowledged") {
      expect(result.acknowledgedAt).toEqual(acknowledgedAt)
      expect(result.acknowledgementSource).toBe("webhook")
      expect(result.externalReference).toBe("EPF-2026-00001")
      expect(result.authorityPayloadHash).toBe("abc123def456")
    }
    // Idempotency is the contract here — second confirmation must NOT
    // produce a second audit row (would imply a second authority decision).
    expect(mockUpdateState).not.toHaveBeenCalled()
    expect(mockWriteAudit).not.toHaveBeenCalled()
  })

  it.each(["draft", "queued", "failed"] as const)(
    "returns `invalid_state` when current state is %s",
    async (state) => {
      mockGetEvidence.mockResolvedValue(
        makeEvidence({ submissionState: state })
      )
      const result = await acknowledgeEvidenceTransition({
        organizationId: "org-1",
        evidenceId: "ev-1",
        source: "webhook",
        acknowledgedByUserId: null,
      })
      expect(result.status).toBe("invalid_state")
      if (result.status === "invalid_state") {
        expect(result.currentState).toBe(state)
      }
      expect(mockUpdateState).not.toHaveBeenCalled()
      expect(mockWriteAudit).not.toHaveBeenCalled()
    }
  )
})

// ---------------------------------------------------------------------------
// Successful transition (manual)
// ---------------------------------------------------------------------------

describe("acknowledgeEvidenceTransition — manual source", () => {
  it("populates provenance fields and emits the EPF audit action", async () => {
    mockGetEvidence.mockResolvedValue(makeEvidence())
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-1",
      source: "manual",
      acknowledgedByUserId: "user-hr",
      actorSessionId: "session-7",
      externalReference: "EPF-2026-99999",
    })

    expect(result.status).toBe("acknowledged")
    if (result.status !== "acknowledged") return

    expect(result.auditAction).toBe("erp.hrm.statutory.epf.acknowledged")
    expect(result.externalReference).toBe("EPF-2026-99999")

    // Mutation called with the new ack columns + source = manual.
    expect(mockUpdateState).toHaveBeenCalledTimes(1)
    const [orgId, evId, state, opts] = mockUpdateState.mock.calls[0]
    expect(orgId).toBe("org-1")
    expect(evId).toBe("ev-1")
    expect(state).toBe("acknowledged")
    expect(opts?.acknowledgementSource).toBe("manual")
    expect(opts?.acknowledgedByUserId).toBe("user-hr")
    expect(opts?.acknowledgedAt).toBeInstanceOf(Date)
    expect(opts?.externalReference).toBe("EPF-2026-99999")
    // Manual flow does NOT pass authorityPayloadHash through.
    expect(opts?.authorityPayloadHash).toBeUndefined()
    // Tri-state preservation: caller did not pass submissionDeliveryId, so
    // the mutation receives `undefined` (= preserve).
    expect("submissionDeliveryId" in (opts ?? {})).toBe(false)

    // Audit emitted once with `acknowledgementSource = manual` + actor info.
    expect(mockWriteAudit).toHaveBeenCalledTimes(1)
    const auditInput = mockWriteAudit.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect(auditInput.action).toBe("erp.hrm.statutory.epf.acknowledged")
    expect(auditInput.organizationId).toBe("org-1")
    expect(auditInput.actorUserId).toBe("user-hr")
    expect(auditInput.actorSessionId).toBe("session-7")
    expect(auditInput.resourceType).toBe("hrm.compliance_evidence")
    expect(auditInput.resourceId).toBe("ev-1")
    const meta = auditInput.metadata as Record<string, unknown>
    expect(meta.acknowledgementSource).toBe("manual")
    expect(meta.method).toBe("manual")
    expect(meta.authorityName).toBe("KWSP")
    expect(meta.authorityPayloadHash).toBeNull()
  })

  it("preserves prior externalReference when caller omits it", async () => {
    mockGetEvidence.mockResolvedValue(
      makeEvidence({ externalReference: "PRIOR-REF-1" })
    )
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-1",
      source: "manual",
      acknowledgedByUserId: "user-hr",
      // externalReference omitted entirely
    })
    expect(result.status).toBe("acknowledged")
    const opts = mockUpdateState.mock.calls[0][3]
    // Tri-state: omitted -> mutation key not present -> column preserved.
    expect("externalReference" in (opts ?? {})).toBe(false)
    if (result.status === "acknowledged") {
      // Result still surfaces the persisted reference for callers/UI.
      expect(result.externalReference).toBe("PRIOR-REF-1")
    }
  })
})

// ---------------------------------------------------------------------------
// Successful transition (webhook)
// ---------------------------------------------------------------------------

describe("acknowledgeEvidenceTransition — webhook source", () => {
  it("records authorityPayloadHash and stamps source = webhook with no actor", async () => {
    mockGetEvidence.mockResolvedValue(
      makeEvidence({ packType: "socso_monthly" })
    )
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-1",
      source: "webhook",
      acknowledgedByUserId: null,
      externalReference: "SOCSO-RECEIPT-42",
      authorityPayloadHash:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      httpContext: {
        path: "/api/integrations/hrm-statutory-acknowledgement/d-1",
        ipAddress: "203.0.113.7",
        userAgent: "PERKESO-Webhook/1.0",
      },
    })

    expect(result.status).toBe("acknowledged")
    if (result.status !== "acknowledged") return
    expect(result.auditAction).toBe("erp.hrm.statutory.socso.acknowledged")
    expect(result.authorityPayloadHash).toBe(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )

    const opts = mockUpdateState.mock.calls[0][3]
    expect(opts?.acknowledgementSource).toBe("webhook")
    // System actor: NULL, never undefined (explicit clear, not preserve).
    expect(opts?.acknowledgedByUserId).toBeNull()
    expect(opts?.updatedByUserId).toBeNull()
    expect(opts?.authorityPayloadHash).toBe(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )

    const auditInput = mockWriteAudit.mock.calls[0][0] as Record<
      string,
      unknown
    >
    expect(auditInput.actorUserId).toBeUndefined()
    expect(auditInput.path).toBe(
      "/api/integrations/hrm-statutory-acknowledgement/d-1"
    )
    expect(auditInput.ipAddress).toBe("203.0.113.7")
    expect(auditInput.userAgent).toBe("PERKESO-Webhook/1.0")
    const meta = auditInput.metadata as Record<string, unknown>
    expect(meta.acknowledgementSource).toBe("webhook")
    expect(meta.authorityName).toBe("PERKESO")
    expect(meta.authorityPayloadHash).toBe(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
  })

  // EA + Borang E intentionally collapse to the same audit string (mirrors
  // the existing `published` mapping for annual LHDN packs — see
  // STATUTORY_PACK_TO_ACK_EVENT_TYPE in statutory-event-types.shared.ts).
  it.each([
    ["epf_monthly", "erp.hrm.statutory.epf.acknowledged", "KWSP"],
    ["socso_monthly", "erp.hrm.statutory.socso.acknowledged", "PERKESO"],
    ["eis_monthly", "erp.hrm.statutory.eis.acknowledged", "PERKESO"],
    ["pcb_monthly", "erp.hrm.statutory.pcb.acknowledged", "LHDN"],
    ["ea_annual", "erp.hrm.statutory.ea.acknowledged", "LHDN"],
    ["borang_e_annual", "erp.hrm.statutory.ea.acknowledged", "LHDN"],
  ] as const)(
    "routes pack type %s -> audit %s + authority %s",
    async (packType, expectedAction, expectedAuthority) => {
      mockGetEvidence.mockResolvedValue(makeEvidence({ packType }))
      const result = await acknowledgeEvidenceTransition({
        organizationId: "org-1",
        evidenceId: "ev-1",
        source: "webhook",
        acknowledgedByUserId: null,
      })
      expect(result.status).toBe("acknowledged")
      if (result.status !== "acknowledged") return
      expect(result.auditAction).toBe(expectedAction)
      const meta = (mockWriteAudit.mock.calls[0][0] as Record<string, unknown>)
        .metadata as Record<string, unknown>
      expect(meta.authorityName).toBe(expectedAuthority)
    }
  )
})

// ---------------------------------------------------------------------------
// Order of operations
// ---------------------------------------------------------------------------

describe("acknowledgeEvidenceTransition — order of operations", () => {
  it("emits audit AFTER the mutation succeeds", async () => {
    mockGetEvidence.mockResolvedValue(makeEvidence())
    const callOrder: string[] = []
    mockUpdateState.mockImplementation(async () => {
      callOrder.push("update")
    })
    mockWriteAudit.mockImplementation(async () => {
      callOrder.push("audit")
    })
    const result = await acknowledgeEvidenceTransition({
      organizationId: "org-1",
      evidenceId: "ev-1",
      source: "manual",
      acknowledgedByUserId: "user-1",
    })
    expect(result.status).toBe("acknowledged")
    expect(callOrder).toEqual(["update", "audit"])
  })

  it("propagates mutation failures and skips the audit write", async () => {
    mockGetEvidence.mockResolvedValue(makeEvidence())
    mockUpdateState.mockRejectedValue(new Error("db down"))
    await expect(
      acknowledgeEvidenceTransition({
        organizationId: "org-1",
        evidenceId: "ev-1",
        source: "manual",
        acknowledgedByUserId: "user-1",
      })
    ).rejects.toThrow("db down")
    expect(mockWriteAudit).not.toHaveBeenCalled()
  })
})
