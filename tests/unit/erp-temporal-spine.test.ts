import { describe, expect, it } from "vitest"

import {
  asTemporal,
  asTemporalFromColumns,
  describeTemporalSpine,
  safeParseTemporal,
  TEMPORAL_SPINE_LAYER_METADATA,
  TEMPORAL_SPINE_INTERNAL_LAYERS,
  TEMPORAL_SPINE_UI_LAYERS,
  temporalNextSchema,
  temporalNowSchema,
  temporalPastSchema,
  temporalSpineSchema,
} from "#lib/erp/temporal-spine.shared"

describe("temporal-spine.shared", () => {
  it("round-trips Past through Zod", () => {
    const past = {
      originNote: "Vendor mismatch",
      triggeredBy: "Lynx",
      sourceRecordRef: { module: "PO", id: "0488", label: "PO-0488" },
    }
    expect(temporalPastSchema.parse(past)).toEqual(past)
  })

  it("requires consequence on Now", () => {
    expect(temporalNowSchema.safeParse({}).success).toBe(false)
    expect(
      temporalNowSchema.parse({
        consequence: "Release approval safely",
        blocker: "VAT",
      })
    ).toMatchObject({ consequence: "Release approval safely", blocker: "VAT" })
  })

  it("safeParseTemporal returns null on malformed input", () => {
    expect(safeParseTemporal(temporalPastSchema, { bogus: 1 })).toBe(null)
    expect(safeParseTemporal(temporalNextSchema, null)).toBe(null)
  })

  it("temporalSpineSchema accepts sparse spine", () => {
    const spine = temporalSpineSchema.parse({
      now: { consequence: "Fix VAT" },
    })
    expect(spine.now?.consequence).toBe("Fix VAT")
  })

  it("describeTemporalSpine builds three facets", () => {
    const d = describeTemporalSpine({
      past: { originNote: "Intake typo", triggeredBy: "system" },
      now: { consequence: "Reconcile VAT", blocker: "CFO" },
      next: {
        nextActorDisplayName: "Mei",
        failureConsequence: "Period close slips",
      },
    })
    expect(d.past).toContain("Intake typo")
    expect(d.past).toContain("Triggered by system")
    expect(d.now).toContain("Reconcile VAT")
    expect(d.now).toContain("Blocked by CFO")
    expect(d.next).toContain("Next owner: Mei")
    expect(d.next).toContain("If ignored: Period close slips")
  })

  it("asTemporal reads nested temporalSpine", () => {
    const t = asTemporal({
      temporalSpine: {
        past: { originNote: "x" },
        now: { consequence: "y" },
        next: { failureConsequence: "z" },
      },
    })
    expect(t.getPast()?.originNote).toBe("x")
    expect(t.getNow()?.consequence).toBe("y")
    expect(t.getNext()?.failureConsequence).toBe("z")
  })

  it("asTemporal returns null facets when spine missing", () => {
    const t = asTemporal({})
    expect(t.getPast()).toBeNull()
    expect(t.getNow()).toBeNull()
    expect(t.getNext()).toBeNull()
  })

  it("asTemporalFromColumns parses loose JSON columns", () => {
    const t = asTemporalFromColumns({
      temporal_past: { originNote: "p" },
      temporal_now: { consequence: "n" },
      temporal_next: { nextActorDisplayName: "Q" },
    })
    expect(t.getPast()?.originNote).toBe("p")
    expect(t.getNow()?.consequence).toBe("n")
    expect(t.getNext()?.nextActorDisplayName).toBe("Q")
  })

  it("asTemporalFromColumns yields null for invalid column payloads", () => {
    const t = asTemporalFromColumns({
      temporal_now: { consequence: "" },
    })
    expect(t.getNow()).toBeNull()
  })

  it("asTemporalFromColumns accepts Drizzle camelCase column keys", () => {
    const t = asTemporalFromColumns({
      temporalPast: { originNote: "camel" },
      temporalNow: { consequence: "now" },
      temporalNext: { failureConsequence: "later" },
    })
    expect(t.getPast()?.originNote).toBe("camel")
    expect(t.getNow()?.consequence).toBe("now")
    expect(t.getNext()?.failureConsequence).toBe("later")
  })

  it("asTemporalFromColumns prefers temporal_* over legacy past_context keys", () => {
    const t = asTemporalFromColumns({
      temporal_now: { consequence: "canonical" },
      now_context: { consequence: "legacy ignored" },
    })
    expect(t.getNow()?.consequence).toBe("canonical")
  })

  it("asTemporalFromColumns reads legacy past_context / now_context / next_context", () => {
    const t = asTemporalFromColumns({
      past_context: { originNote: "legacy past" },
      now_context: { consequence: "legacy now" },
      next_context: { nextActorDisplayName: "legacy next" },
    })
    expect(t.getPast()?.originNote).toBe("legacy past")
    expect(t.getNow()?.consequence).toBe("legacy now")
    expect(t.getNext()?.nextActorDisplayName).toBe("legacy next")
  })

  it("exposes canonical UI/internal layer metadata", () => {
    expect(TEMPORAL_SPINE_UI_LAYERS).toEqual(["past", "now", "next"])
    expect(TEMPORAL_SPINE_INTERNAL_LAYERS).toEqual([
      "past",
      "present",
      "future",
    ])
    expect(TEMPORAL_SPINE_LAYER_METADATA.past.crudSapFocus).toEqual([
      "search",
      "audit",
    ])
    expect(TEMPORAL_SPINE_LAYER_METADATA.now.internalLabel).toBe("Present")
    expect(TEMPORAL_SPINE_LAYER_METADATA.next.crudSapFocus).toEqual([
      "predict",
      "create",
    ])
  })
})
