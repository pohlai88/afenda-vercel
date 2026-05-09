import { describe, expect, it } from "vitest"

import {
  auditEvent7W1HSchema,
  describeAuditEvent7W1H,
  extractTrailingAuditVerb,
  formatRecordedRelative,
  trimAuditCache,
  type AuditEvent7W1H,
} from "#lib/erp/audit-7w1h.shared"

const baseEvent = (): Omit<AuditEvent7W1H, "why" | "action"> => ({
  who: "Jordan Liu",
  what: "Opened a VAT variance",
  when: "2026-05-09T06:00:00.000Z",
  where: "Purchase · supplier intake",
  which: "PO-0488",
  whom: "CFO route",
  how: "server-action",
})

describe("audit-7w1h.shared", () => {
  it("extractTrailingAuditVerb reads last segment", () => {
    expect(extractTrailingAuditVerb("erp.onething.onething.resolve")).toBe(
      "resolve"
    )
    expect(
      extractTrailingAuditVerb("erp.onething.onething.prediction_accepted")
    ).toBe("prediction_accepted")
  })

  it("requires non-empty why for resolve / update / deprecate", () => {
    const e = {
      ...baseEvent(),
      why: "",
      action: "erp.onething.onething.resolve",
    }
    expect(auditEvent7W1HSchema.safeParse(e).success).toBe(false)
    expect(
      auditEvent7W1HSchema.safeParse({
        ...baseEvent(),
        why: "Period close safety",
        action: "erp.onething.onething.resolve",
      }).success
    ).toBe(true)
  })

  it("allows empty why for create", () => {
    const parsed = auditEvent7W1HSchema.parse({
      ...baseEvent(),
      why: "",
      action: "erp.onething.onething.create",
    })
    expect(parsed.why).toBe("")
  })

  it("trimAuditCache appends and caps", () => {
    const a: AuditEvent7W1H = {
      ...baseEvent(),
      why: "a",
      action: "erp.x.y.create",
      what: "A",
    }
    const b: AuditEvent7W1H = { ...a, what: "B", action: "erp.x.y.create" }
    const c: AuditEvent7W1H = { ...a, what: "C", action: "erp.x.y.create" }
    const out = trimAuditCache([a, b], c, { keep: 2 })
    expect(out.map((x) => x.what)).toEqual(["B", "C"])
  })

  it("trimAuditCache handles null cache", () => {
    const a: AuditEvent7W1H = {
      ...baseEvent(),
      why: "r",
      action: "erp.x.y.resolve",
    }
    expect(trimAuditCache(null, a).length).toBe(1)
  })

  it("formatRecordedRelative formats buckets", () => {
    const now = Date.parse("2026-05-09T07:05:00.000Z")
    expect(formatRecordedRelative("2026-05-09T07:04:30.000Z", now)).toBe(
      "just now"
    )
    expect(formatRecordedRelative("2026-05-09T07:01:00.000Z", now)).toMatch(
      /minute/
    )
  })

  it("describeAuditEvent7W1H is a single natural sentence without label tokens", () => {
    const nowMs = Date.parse("2026-05-09T07:05:00.000Z")
    const s = describeAuditEvent7W1H(
      auditEvent7W1HSchema.parse({
        ...baseEvent(),
        why: "Close safety required canonical VAT.",
        action: "erp.onething.onething.resolve",
      }),
      { nowMs }
    )
    expect(s.length).toBeGreaterThan(20)
    expect(s).not.toMatch(/\bWHO:/i)
    expect(s).not.toMatch(/\bWHEN:/i)
    expect(s).not.toMatch(/\bWHAT:/i)
    expect(s).not.toMatch(/\bWHERE:/i)
    expect(s).not.toMatch(/\bWHY:/i)
    expect(s).not.toMatch(/\bWHICH:/i)
    expect(s).not.toMatch(/\bWHOM:/i)
    expect(s).not.toMatch(/\bHOW:/i)
    expect(s).toContain("Jordan Liu")
    expect(s).toContain("Purchase")
    expect(s).toContain("via a server action")
  })
})
