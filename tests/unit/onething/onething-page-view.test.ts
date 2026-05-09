import { describe, expect, it } from "vitest"

import {
  buildOrgOneThingCaptureSeedParts,
  buildPersonalOneThingCaptureSeedParts,
  parseOneThingCanvasSearchParams,
  resolveOneThingCanvasWithFocusOverride,
  sliceOperationalOneThingTail,
  ONETHING_CAPTURE_RUN_PARAM_MAX_LEN,
} from "#features/onething/data/onething-page-view.shared"
import type { RankedOneThing } from "#features/onething/data/onething-rank.shared"
import type { OneThingRow } from "#features/onething"

function row(
  overrides: Partial<OneThingRow> & { id: string; state?: OneThingRow["state"] }
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

describe("parseOneThingCanvasSearchParams", () => {
  it("parses focus and trims run with max length", () => {
    const longRun = "x".repeat(ONETHING_CAPTURE_RUN_PARAM_MAX_LEN + 50)
    const { focusId, runId } = parseOneThingCanvasSearchParams({
      focus: "onething-1",
      run: longRun,
    })
    expect(focusId).toBe("onething-1")
    expect(runId?.length).toBe(ONETHING_CAPTURE_RUN_PARAM_MAX_LEN)
  })

  it("treats empty run as null", () => {
    expect(parseOneThingCanvasSearchParams({ run: "   " }).runId).toBeNull()
  })
})

describe("resolveOneThingCanvasWithFocusOverride", () => {
  const onething = [
    row({ id: "a", state: "detected" }),
    row({ id: "b", state: "resolved" }),
  ]

  it("keeps ranked canvas when focus id missing", () => {
    const r = resolveOneThingCanvasWithFocusOverride({
      onething,
      rankedCanvas: onething[0]!,
      rankedWhyNow: "rank why",
      focusId: null,
      focusWhyNowLabel: "focus why",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("rank why")
  })

  it("overrides to active focus onething", () => {
    const r = resolveOneThingCanvasWithFocusOverride({
      onething,
      rankedCanvas: onething[0]!,
      rankedWhyNow: "rank why",
      focusId: "a",
      focusWhyNowLabel: "opened",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("opened")
  })

  it("ignores focus when state is not canvas-eligible", () => {
    const r = resolveOneThingCanvasWithFocusOverride({
      onething,
      rankedCanvas: onething[0]!,
      rankedWhyNow: "rank why",
      focusId: "b",
      focusWhyNowLabel: "opened",
    })
    expect(r.canvas?.id).toBe("a")
    expect(r.whyNow).toBe("rank why")
  })
})

describe("sliceOperationalOneThingTail", () => {
  it("excludes canvas id and respects limit", () => {
    const ranked: RankedOneThing[] = [
      { ...row({ id: "1" }), rankScore: 3 },
      { ...row({ id: "2" }), rankScore: 2 },
      { ...row({ id: "3" }), rankScore: 1 },
    ]
    const tail = sliceOperationalOneThingTail(ranked, "1", 2)
    expect(tail.map((t) => t.id)).toEqual(["2", "3"])
  })
})

describe("capture seed builders", () => {
  it("builds org linkage JSON", () => {
    const p = buildOrgOneThingCaptureSeedParts({
      orgSlug: "acme",
      locale: "en",
      runId: "run-1",
    })
    expect(JSON.parse(p.linkageJson)).toMatchObject({
      owningModule: "ONETHING",
      runId: "run-1",
      entities: [{ module: "ORG", id: "acme", meta: "en" }],
    })
  })

  it("builds personal linkage JSON", () => {
    const p = buildPersonalOneThingCaptureSeedParts({
      locale: "en",
      runId: null,
    })
    expect(JSON.parse(p.linkageJson)).toMatchObject({
      owningModule: "ONETHING",
      entities: [{ module: "SCOPE", id: "personal" }],
    })
  })
})
