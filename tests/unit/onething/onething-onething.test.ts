import { describe, expect, it } from "vitest"

import {
  canTransitionOneThingState,
  derivePredictionsFromImpact,
  evaluateResolveDoD,
  inferResolveSeverityFromSignals,
  mapLegacyOneThingStateToOneThingState,
  resolveSeverityForOneThingRow,
  safeParsePredictions,
  safeParseResolutionProof,
  safeParseTemporalNext,
  safeParseTemporalNow,
  safeParseTemporalPast,
} from "#features/onething"
import type { OneThingRow } from "#features/onething"

function baseRow(overrides: Partial<OneThingRow> = {}): OneThingRow {
  return {
    id: "onething-1",
    listId: "list-1",
    title: "t",
    consequence: "",
    state: "detected",
    severity: "medium",
    dueAt: null,
    snoozeUntil: null,
    assigneeUserId: null,
    recurrenceRule: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    ...overrides,
  }
}

describe("mapLegacyOneThingStateToOneThingState", () => {
  it("maps pending with assignee to owned", () => {
    expect(mapLegacyOneThingStateToOneThingState("pending", "u1")).toBe("owned")
  })

  it("maps pending without assignee to detected", () => {
    expect(mapLegacyOneThingStateToOneThingState("pending", null)).toBe(
      "detected"
    )
  })

  it("maps completed to resolved", () => {
    expect(mapLegacyOneThingStateToOneThingState("completed", null)).toBe(
      "resolved"
    )
  })
})

describe("canTransitionOneThingState", () => {
  it("allows detected → resolved", () => {
    expect(canTransitionOneThingState("detected", "resolved")).toBe(true)
  })

  it("disallows resolved → resolved", () => {
    expect(canTransitionOneThingState("resolved", "resolved")).toBe(false)
  })
})

describe("resolveSeverityForOneThingRow", () => {
  it("returns critical when an open critical prediction exists", () => {
    const row = baseRow({
      predictions: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          generatedBy: "ranker",
          generatedAt: "2026-01-01T00:00:00.000Z",
          claim: "c",
          severity: "critical",
        },
      ],
    })
    expect(resolveSeverityForOneThingRow(row)).toBe("critical")
  })

  it("returns high when blocksGate is set", () => {
    const row = baseRow({ impact: { blocksGate: "period-close" } })
    expect(resolveSeverityForOneThingRow(row)).toBe("high")
  })
})

describe("safeParse helpers", () => {
  it("parses temporal past when valid", () => {
    expect(
      safeParseTemporalPast({ originNote: "x", triggeredBy: "y" })
    ).toMatchObject({ originNote: "x", triggeredBy: "y" })
  })

  it("returns null for invalid temporal payloads", () => {
    expect(safeParseTemporalNow({})).toBeNull()
    expect(safeParseTemporalNext({ bogus: 1 })).toBeNull()
    expect(safeParseTemporalPast(null)).toBeNull()
  })

  it("filters predictions array to valid entries only", () => {
    const raw = [
      {
        id: "00000000-0000-4000-8000-000000000099",
        generatedBy: "ranker",
        generatedAt: "2026-01-01T00:00:00.000Z",
        claim: "ok",
        severity: "low",
      },
      { id: "not-a-uuid" },
    ]
    expect(safeParsePredictions(raw)).toHaveLength(1)
  })

  it("parses resolution proof array", () => {
    const pr = safeParseResolutionProof([
      { type: "doc", ref: "https://example.com/a" },
    ])
    expect(pr).toHaveLength(1)
  })
})

describe("inferResolveSeverityFromSignals", () => {
  it("returns critical from open critical prediction", () => {
    expect(
      inferResolveSeverityFromSignals({
        severity: "medium",
        predictions: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            generatedBy: "ranker",
            generatedAt: "2026-01-01T00:00:00.000Z",
            claim: "c",
            severity: "critical",
          },
        ],
      })
    ).toBe("critical")
  })

  it("returns high from slip cost alone when no critical prediction", () => {
    expect(
      inferResolveSeverityFromSignals({
        severity: "medium",
        slipCostUsd: 12_000,
        predictions: [],
      })
    ).toBe("high")
  })
})

describe("derivePredictionsFromImpact", () => {
  it("emits gate and slip predictions from impact", () => {
    const preds = derivePredictionsFromImpact(
      baseRow({
        impact: { blocksGate: "close", slipCostUsd: 2000 },
      })
    )
    expect(preds.length).toBeGreaterThanOrEqual(2)
    expect(preds.some((p) => p.claim.includes("close"))).toBe(true)
  })
})

describe("evaluateResolveDoD", () => {
  it("passes low severity without note", () => {
    const r = evaluateResolveDoD("low", {
      resolutionNote: "",
      resolutionProofCount: 0,
      predictions: [],
      willClearPredictionsOnResolve: true,
    })
    expect(r.ok).toBe(true)
  })

  it("fails medium without note", () => {
    const r = evaluateResolveDoD("medium", {
      resolutionNote: "   ",
      resolutionProofCount: 0,
      predictions: [],
      willClearPredictionsOnResolve: true,
    })
    expect(r.ok).toBe(false)
  })

  it("requires proof for high severity", () => {
    expect(
      evaluateResolveDoD("high", {
        resolutionNote: "done",
        resolutionProofCount: 0,
        predictions: [],
        willClearPredictionsOnResolve: true,
      }).ok
    ).toBe(false)
    expect(
      evaluateResolveDoD("high", {
        resolutionNote: "done",
        resolutionProofCount: 1,
        predictions: [],
        willClearPredictionsOnResolve: true,
      }).ok
    ).toBe(true)
  })

  it("blocks critical unaccepted prediction without proof", () => {
    const preds = [
      {
        severity: "critical" as const,
        clearedAt: undefined,
        acceptedByUserId: undefined,
      },
    ]
    expect(
      evaluateResolveDoD("low", {
        resolutionNote: "x",
        resolutionProofCount: 0,
        predictions: preds,
        willClearPredictionsOnResolve: true,
      }).ok
    ).toBe(false)
    expect(
      evaluateResolveDoD("low", {
        resolutionNote: "x",
        resolutionProofCount: 1,
        predictions: preds,
        willClearPredictionsOnResolve: true,
      }).ok
    ).toBe(true)
  })
})
