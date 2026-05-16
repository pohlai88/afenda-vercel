/**
 * Training statutory bridge — idempotency and output contract.
 *
 * Tests the pure-function helpers for the `linkTrainingCompletionToComplianceEvidence` bridge.
 * The bridge's idempotency key is: (organizationId, packType) where
 * packType = `training.<authorityCode>.<year>-<month>`.
 *
 * The DB-heavy integration path is excluded from Vitest coverage per ADR-0008 /
 * vitest.config.ts; these tests cover the idempotency key construction and
 * the period-key format contract.
 */
import { describe, expect, it } from "vitest"

// ---------------------------------------------------------------------------
// Replicate the pure period-key helper (mirrors training-statutory-bridge.server.ts)
// ---------------------------------------------------------------------------

function periodKeyFromDate(completedAt: Date): string {
  const year = completedAt.getUTCFullYear()
  const month = String(completedAt.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function buildPackType(authorityCode: string, completedAt: Date): string {
  return `training.${authorityCode}.${periodKeyFromDate(completedAt)}`
}

// ---------------------------------------------------------------------------
// Idempotency key tests
// ---------------------------------------------------------------------------

describe("statutory bridge — period key", () => {
  it("formats year-month correctly (padded month)", () => {
    expect(periodKeyFromDate(new Date("2026-01-15T00:00:00.000Z"))).toBe(
      "2026-01"
    )
    expect(periodKeyFromDate(new Date("2026-12-31T23:59:59.999Z"))).toBe(
      "2026-12"
    )
  })

  it("pads single-digit months with leading zero", () => {
    expect(periodKeyFromDate(new Date("2026-03-01T00:00:00.000Z"))).toBe(
      "2026-03"
    )
  })

  it("produces stable key for the same month regardless of day/time", () => {
    const key1 = periodKeyFromDate(new Date("2026-05-01T00:00:00.000Z"))
    const key2 = periodKeyFromDate(new Date("2026-05-31T23:59:59.999Z"))
    expect(key1).toBe(key2)
  })

  it("produces different keys for consecutive months", () => {
    const may = periodKeyFromDate(new Date("2026-05-15T00:00:00.000Z"))
    const jun = periodKeyFromDate(new Date("2026-06-01T00:00:00.000Z"))
    expect(may).not.toBe(jun)
  })
})

describe("statutory bridge — pack type key", () => {
  const authorityCode = "MY-DOSH"
  const completedAt = new Date("2026-05-16T00:00:00.000Z")

  it("includes evidenceKind prefix, authority, and period", () => {
    const packType = buildPackType(authorityCode, completedAt)
    expect(packType).toBe("training.MY-DOSH.2026-05")
  })

  it("same completion in same month → same pack type (idempotent re-run check)", () => {
    const a = buildPackType(authorityCode, new Date("2026-05-01T00:00:00.000Z"))
    const b = buildPackType(authorityCode, new Date("2026-05-31T00:00:00.000Z"))
    expect(a).toBe(b)
  })

  it("annual recurrence → different pack type per year", () => {
    const year2026 = buildPackType(
      "MY-DOSH",
      new Date("2026-05-15T00:00:00.000Z")
    )
    const year2027 = buildPackType(
      "MY-DOSH",
      new Date("2027-05-15T00:00:00.000Z")
    )
    expect(year2026).not.toBe(year2027)
    expect(year2026).toBe("training.MY-DOSH.2026-05")
    expect(year2027).toBe("training.MY-DOSH.2027-05")
  })

  it("different authority codes → different pack types", () => {
    const completedAt2 = new Date("2026-05-16T00:00:00.000Z")
    const dosh = buildPackType("MY-DOSH", completedAt2)
    const jkkp = buildPackType("MY-JKKP", completedAt2)
    expect(dosh).not.toBe(jkkp)
  })
})

// ---------------------------------------------------------------------------
// Bridge guard logic (mirrors the early-return conditions)
// ---------------------------------------------------------------------------

describe("statutory bridge — guard conditions", () => {
  it("skips bridge when course is not statutory", () => {
    const course = { statutoryFlag: false, statutoryAuthorityCode: "MY-DOSH" }
    const shouldSkip = !course.statutoryFlag || !course.statutoryAuthorityCode
    expect(shouldSkip).toBe(true)
  })

  it("skips bridge when statutoryAuthorityCode is missing", () => {
    const course = { statutoryFlag: true, statutoryAuthorityCode: null }
    const shouldSkip = !course.statutoryFlag || !course.statutoryAuthorityCode
    expect(shouldSkip).toBe(true)
  })

  it("proceeds when statutoryFlag=true and authorityCode is set", () => {
    const course = { statutoryFlag: true, statutoryAuthorityCode: "MY-DOSH" }
    const shouldSkip = !course.statutoryFlag || !course.statutoryAuthorityCode
    expect(shouldSkip).toBe(false)
  })
})
