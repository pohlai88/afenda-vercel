import { describe, expect, it } from "vitest"

import {
  buildWhyNow,
  computeOneThingRankScore,
  formatHorizon,
  rankOneThingForCanvas,
} from "#features/onething/data/onething-rank.shared"
import type { OneThingRow } from "#features/onething"

const FROZEN_NOW = new Date("2026-01-15T12:00:00.000Z")
const HOUR_MS = 60 * 60 * 1000

function makeOneThing(
  overrides: Partial<OneThingRow> & { id: string }
): OneThingRow {
  return {
    id: overrides.id,
    listId: overrides.listId ?? "list-1",
    title: overrides.title ?? `onething ${overrides.id}`,
    consequence: overrides.consequence ?? "",
    state: overrides.state ?? "detected",
    severity: overrides.severity ?? "medium",
    dueAt: overrides.dueAt ?? null,
    snoozeUntil: overrides.snoozeUntil ?? null,
    assigneeUserId: overrides.assigneeUserId ?? null,
    recurrenceRule: overrides.recurrenceRule ?? null,
    position: overrides.position ?? 0,
    createdAt: overrides.createdAt ?? new Date("2026-01-10T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-10T00:00:00.000Z"),
    linkage: overrides.linkage ?? null,
    counterparty: overrides.counterparty ?? null,
    provenance: overrides.provenance ?? null,
    impact: overrides.impact ?? null,
    temporalPast: overrides.temporalPast ?? null,
    temporalNow: overrides.temporalNow ?? null,
    temporalNext: overrides.temporalNext ?? null,
    resolvedAt: overrides.resolvedAt ?? null,
    deprecatedAt: overrides.deprecatedAt ?? null,
    resolutionNote: overrides.resolutionNote ?? null,
    resolutionProof: overrides.resolutionProof ?? null,
    predictions: overrides.predictions ?? null,
    audit7w1h: overrides.audit7w1h ?? null,
  }
}

describe("rankOneThingForCanvas — empty / inactive states", () => {
  it("returns null canvas + empty tail when input is empty", () => {
    const { canvas, tail, whyNow } = rankOneThingForCanvas([], {
      now: FROZEN_NOW,
    })
    expect(canvas).toBeNull()
    expect(tail).toEqual([])
    expect(whyNow).toMatch(/nothing in your queue/i)
  })

  it("filters out resolved / deprecated / released onething", () => {
    const onething = [
      makeOneThing({ id: "a", state: "resolved" }),
      makeOneThing({ id: "b", state: "deprecated" }),
      makeOneThing({ id: "c", state: "released" }),
    ]
    const { canvas, tail } = rankOneThingForCanvas(onething, {
      now: FROZEN_NOW,
    })
    expect(canvas).toBeNull()
    expect(tail).toEqual([])
  })

  it("includes detected and resolving only", () => {
    const onething = [
      makeOneThing({ id: "a", state: "detected" }),
      makeOneThing({ id: "b", state: "resolving" }),
      makeOneThing({ id: "c", state: "resolved" }),
    ]
    const { ranked } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(ranked.map((r) => r.id)).toEqual(expect.arrayContaining(["a", "b"]))
    expect(ranked.map((r) => r.id)).not.toContain("c")
  })
})

describe("rankOneThingForCanvas — signal weighting", () => {
  it("higher unblocks ranks above lower unblocks", () => {
    const onething = [
      makeOneThing({ id: "low", impact: { unblocks: 1 } }),
      makeOneThing({ id: "high", impact: { unblocks: 5 } }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("high")
  })

  it("tighter SLA horizon ranks above looser", () => {
    const onething = [
      makeOneThing({ id: "loose", impact: { slaHorizonMs: 10 * HOUR_MS } }),
      makeOneThing({ id: "tight", impact: { slaHorizonMs: HOUR_MS } }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("tight")
  })

  it("already-blocking SLA ranks above any future SLA", () => {
    const onething = [
      makeOneThing({ id: "tight", impact: { slaHorizonMs: 30 * 60_000 } }),
      makeOneThing({ id: "past", impact: { slaHorizonMs: -1 * HOUR_MS } }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("past")
  })

  it("severity lifts an otherwise-equal onething", () => {
    const onething = [
      makeOneThing({ id: "norm", severity: "medium" }),
      makeOneThing({ id: "urg", severity: "critical" }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("urg")
  })

  it("provenance.kind === 'lynx' beats 'cron' on equal signals", () => {
    const onething = [
      makeOneThing({ id: "cron", provenance: { kind: "cron" } }),
      makeOneThing({ id: "lynx", provenance: { kind: "lynx" } }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("lynx")
  })

  it("uses dueAt as fallback when impact.slaHorizonMs is absent", () => {
    const onething = [
      makeOneThing({
        id: "no-due",
        severity: "medium",
      }),
      makeOneThing({
        id: "due-soon",
        severity: "medium",
        dueAt: new Date(FROZEN_NOW.getTime() + 30 * 60_000),
      }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("due-soon")
  })

  it("blocksGate adds an explicit lift", () => {
    const onething = [
      makeOneThing({ id: "noop", impact: { unblocks: 1 } }),
      makeOneThing({
        id: "gated",
        impact: { unblocks: 1, blocksGate: "period-close" },
      }),
    ]
    const { canvas } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    expect(canvas?.id).toBe("gated")
  })
})

describe("rankOneThingForCanvas — determinism + tie-breaking", () => {
  it("breaks ties by createdAt asc, then id asc", () => {
    const sameImpact = { unblocks: 3 } as const
    const onething = [
      makeOneThing({
        id: "z",
        impact: sameImpact,
        createdAt: new Date("2026-01-09T00:00:00.000Z"),
      }),
      makeOneThing({
        id: "a",
        impact: sameImpact,
        createdAt: new Date("2026-01-09T00:00:00.000Z"),
      }),
      makeOneThing({
        id: "k",
        impact: sameImpact,
        createdAt: new Date("2026-01-08T00:00:00.000Z"),
      }),
    ]
    const { ranked } = rankOneThingForCanvas(onething, { now: FROZEN_NOW })
    // older createdAt first, then id asc on the same-day rows
    expect(ranked.map((r) => r.id)).toEqual(["k", "a", "z"])
  })

  it("is deterministic across input shuffles", () => {
    const base: OneThingRow[] = [
      makeOneThing({ id: "u1", impact: { unblocks: 4 } }),
      makeOneThing({
        id: "u2",
        impact: { slaHorizonMs: 30 * 60_000, unblocks: 1 },
      }),
      makeOneThing({ id: "u3", severity: "critical" }),
      makeOneThing({
        id: "u4",
        provenance: { kind: "lynx", note: "vat variance" },
      }),
      makeOneThing({ id: "u5", impact: { slipCostUsd: 50_000 } }),
    ]
    const shuffles = [
      [base[0]!, base[1]!, base[2]!, base[3]!, base[4]!],
      [base[4]!, base[3]!, base[2]!, base[1]!, base[0]!],
      [base[2]!, base[0]!, base[4]!, base[1]!, base[3]!],
      [base[1]!, base[4]!, base[0]!, base[3]!, base[2]!],
    ]
    const orderings = shuffles.map(
      (s) =>
        rankOneThingForCanvas(s, { now: FROZEN_NOW }).ranked.map((r) => r.id) //
    )
    for (const o of orderings) {
      expect(o).toEqual(orderings[0])
    }
  })

  it("respects tailLimit", () => {
    const onething = Array.from({ length: 12 }, (_, i) =>
      makeOneThing({
        id: `t${i.toString().padStart(2, "0")}`,
        impact: { unblocks: 12 - i },
      })
    )
    const { canvas, tail } = rankOneThingForCanvas(onething, {
      now: FROZEN_NOW,
      tailLimit: 4,
    })
    expect(canvas?.id).toBe("t00")
    expect(tail).toHaveLength(4)
    expect(tail.map((r) => r.id)).toEqual(["t01", "t02", "t03", "t04"])
  })
})

describe("computeOneThingRankScore — OneThing boosts", () => {
  it("adds +20 when a critical prediction is open (unaccepted, uncleared)", () => {
    const base = makeOneThing({
      id: "a",
      impact: { unblocks: 3 },
    })
    const crit = makeOneThing({
      id: "b",
      impact: { unblocks: 3 },
      predictions: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          generatedBy: "ranker",
          generatedAt: "2026-01-15T12:00:00.000Z",
          claim: "If ignored, period close fails.",
          severity: "critical",
        },
      ],
    })
    expect(computeOneThingRankScore(crit, FROZEN_NOW)).toBe(
      computeOneThingRankScore(base, FROZEN_NOW) + 20
    )
  })

  it("ranks detected ahead of owned when impact is identical", () => {
    const owned = makeOneThing({
      id: "o",
      state: "owned",
      impact: { unblocks: 3 },
    })
    const detected = makeOneThing({
      id: "d",
      state: "detected",
      impact: { unblocks: 3 },
    })
    expect(computeOneThingRankScore(detected, FROZEN_NOW)).toBeGreaterThan(
      computeOneThingRankScore(owned, FROZEN_NOW)
    )
  })
})

describe("computeOneThingRankScore", () => {
  it("returns -1 for inactive states (so they sort to the end if mixed in)", () => {
    expect(
      computeOneThingRankScore(
        makeOneThing({ id: "x", state: "resolved" }),
        FROZEN_NOW
      )
    ).toBe(-1)
  })

  it("returns 0 for a bare detected onething with no signals", () => {
    expect(
      computeOneThingRankScore(makeOneThing({ id: "x" }), FROZEN_NOW)
      // severity default "medium" carries +6 and detected state lift carries +8
    ).toBe(14)
  })
})

describe("buildWhyNow", () => {
  it("combines unblocks + SLA when both are strong", () => {
    const t = makeOneThing({
      id: "x",
      impact: { unblocks: 3, slaHorizonMs: 2 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(
      /unblocks 3 other consequences and an SLA in 2h/
    )
  })

  it("emits unblocks-only when no SLA pressure", () => {
    const t = makeOneThing({ id: "x", impact: { unblocks: 4 } })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because resolving it unblocks 4 other consequences"
    )
  })

  it("emits gate phrasing when blocksGate is present and SLA is short", () => {
    const t = makeOneThing({
      id: "x",
      impact: { blocksGate: "period close", slaHorizonMs: 5 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/blocks period close in 5h/)
  })

  it("emits SLA-only when SLA is the only short window", () => {
    const t = makeOneThing({
      id: "x",
      impact: { slaHorizonMs: 30 * 60_000 },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/SLA window is 30m/)
  })

  it("uses the past-SLA phrasing for negative horizons", () => {
    const t = makeOneThing({
      id: "x",
      impact: { slaHorizonMs: -2 * HOUR_MS },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/already past/)
  })

  it("falls back to slip cost when impact carries it alone", () => {
    const t = makeOneThing({ id: "x", impact: { slipCostUsd: 12_400 } })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because slip cost is ~$12.4K"
    )
  })

  it("verbalises lynx provenance with note when no impact signals", () => {
    const t = makeOneThing({
      id: "x",
      provenance: { kind: "lynx", note: "vat cluster 0.78" },
    })
    expect(buildWhyNow(t, FROZEN_NOW)).toBe(
      "first because Lynx flagged it · vat cluster 0.78"
    )
  })

  it("falls back to a neutral sentence when nothing is informative", () => {
    const t = makeOneThing({ id: "x" })
    expect(buildWhyNow(t, FROZEN_NOW)).toMatch(/most unblocking thing/i)
  })
})

describe("formatHorizon", () => {
  it("formats < 1h in minutes", () => {
    expect(formatHorizon(30 * 60_000)).toBe("30m")
  })
  it("formats hours + minutes when both", () => {
    expect(formatHorizon(2 * HOUR_MS + 14 * 60_000)).toBe("2h 14m")
  })
  it("drops minutes when 0", () => {
    expect(formatHorizon(3 * HOUR_MS)).toBe("3h")
  })
  it("formats days + hours when > 24h", () => {
    expect(formatHorizon(25 * HOUR_MS)).toBe("1d 1h")
  })
  it("formats < 1m as 'less than 1m'", () => {
    expect(formatHorizon(30_000)).toMatch(/less than 1m/)
  })
})
