/**
 * Phase 3N — Bureau operational reliability projection.
 *
 * Tests lock the pure composer + classifier + median against the
 * operational doctrine encoded in `bureau-reliability.shared.ts`.
 * The DB-coupled composer (`getBureauReliabilitySnapshot`) is exercised
 * by the page render in production; the math is what we golden-test.
 *
 * Doctrine being locked here:
 *   1. Rates are NULL (not 0) when the denominator is zero — the UI
 *      must distinguish "no signal" from "100% failure".
 *   2. `draft` rows are EXCLUDED from the denominator — they have not
 *      entered the pipeline yet.
 *   3. The MIN_SIGNAL_COUNT threshold prevents a single failure from
 *      painting an entire bureau red.
 *   4. `oldestPendingAckAgeDays` only tracks `submitted` rows (not
 *     `failed`, not `acknowledged`, not `queued`).
 *   5. The authority list is the inverse of `STATUTORY_PACK_TO_AUTHORITY`
 *      and renders deterministically — adding a pack to a new authority
 *      will surface that authority in the snapshot automatically.
 */
import { describe, expect, it } from "vitest"

import {
  BUREAU_RELIABILITY_AUTHORITIES,
  BUREAU_RELIABILITY_CRITICAL_THRESHOLD,
  BUREAU_RELIABILITY_DEGRADED_THRESHOLD,
  BUREAU_RELIABILITY_HEALTH_LEVELS,
  BUREAU_RELIABILITY_MIN_SIGNAL_COUNT,
  BUREAU_RELIABILITY_WINDOW_DAYS,
  classifyBureauHealth,
  computeBureauReliabilitySummary,
  computeMedian,
  dayAge,
  isBureauReliabilityHealth,
  type BureauReliabilityClassifierRow,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/bureau-reliability.shared.ts"
import { STATUTORY_PACK_TO_AUTHORITY } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/statutory-event-types.shared.ts"

const FIXED_NOW = new Date("2026-05-12T06:00:00.000Z")

function dayOffset(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

function makeRow(
  overrides: Partial<BureauReliabilityClassifierRow> = {}
): BureauReliabilityClassifierRow {
  // Use spread so explicit `null` / `undefined` overrides win over defaults
  // (??-coalescing would silently coerce explicit nulls to defaults).
  return {
    packType: "epf_monthly",
    submissionState: "submitted",
    deliveryState: "delivered",
    deliveryDurationMs: 1200,
    deliveryCompletedAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Doctrine constants
// ---------------------------------------------------------------------------

describe("Bureau reliability — doctrine constants", () => {
  it("health levels are the closed sorted set", () => {
    expect([...BUREAU_RELIABILITY_HEALTH_LEVELS].sort()).toEqual([
      "critical",
      "degraded",
      "healthy",
      "no_data",
    ])
  })

  it("isBureauReliabilityHealth narrows correctly", () => {
    expect(isBureauReliabilityHealth("healthy")).toBe(true)
    expect(isBureauReliabilityHealth("not_a_level")).toBe(false)
    expect(isBureauReliabilityHealth(null)).toBe(false)
    expect(isBureauReliabilityHealth(undefined)).toBe(false)
  })

  it("threshold ordering is monotone (critical < degraded < 1)", () => {
    expect(BUREAU_RELIABILITY_CRITICAL_THRESHOLD).toBeGreaterThan(0)
    expect(BUREAU_RELIABILITY_CRITICAL_THRESHOLD).toBeLessThan(
      BUREAU_RELIABILITY_DEGRADED_THRESHOLD
    )
    expect(BUREAU_RELIABILITY_DEGRADED_THRESHOLD).toBeLessThan(1)
  })

  it("window days defaults to a Malaysian payroll cycle + buffer", () => {
    expect(BUREAU_RELIABILITY_WINDOW_DAYS).toBeGreaterThanOrEqual(28)
    expect(BUREAU_RELIABILITY_WINDOW_DAYS).toBeLessThanOrEqual(45)
  })

  it("min signal count is small enough to be meaningful, large enough to suppress noise", () => {
    expect(BUREAU_RELIABILITY_MIN_SIGNAL_COUNT).toBeGreaterThanOrEqual(2)
    expect(BUREAU_RELIABILITY_MIN_SIGNAL_COUNT).toBeLessThanOrEqual(10)
  })

  it("authority list is the inverse of STATUTORY_PACK_TO_AUTHORITY (deduplicated)", () => {
    const expected = new Set(Object.values(STATUTORY_PACK_TO_AUTHORITY))
    const actual = new Set(BUREAU_RELIABILITY_AUTHORITIES)
    expect(actual).toEqual(expected)
  })
})

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("Bureau reliability — computeMedian", () => {
  it("returns null on empty input", () => {
    expect(computeMedian([])).toBeNull()
  })

  it("returns the single value when length is 1", () => {
    expect(computeMedian([42])).toBe(42)
  })

  it("computes the middle value for odd-length arrays", () => {
    expect(computeMedian([1, 2, 3])).toBe(2)
    expect(computeMedian([5, 1, 9, 3, 7])).toBe(5)
  })

  it("averages the two middle values for even-length arrays", () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5)
    expect(computeMedian([100, 200])).toBe(150)
  })

  it("does not mutate the input", () => {
    const input = [3, 1, 2]
    const snapshot = [...input]
    computeMedian(input)
    expect(input).toEqual(snapshot)
  })
})

describe("Bureau reliability — dayAge", () => {
  it("returns 0 for `then === now`", () => {
    expect(dayAge(FIXED_NOW, FIXED_NOW)).toBe(0)
  })

  it("returns the floor of elapsed days", () => {
    expect(dayAge(FIXED_NOW, dayOffset(FIXED_NOW, -3))).toBe(3)
    // 6 days + 23 hours = floor 6
    const sixDaysAgo = new Date(
      FIXED_NOW.getTime() - (6 * 24 + 23) * 60 * 60 * 1000
    )
    expect(dayAge(FIXED_NOW, sixDaysAgo)).toBe(6)
  })

  it("clamps future timestamps to 0 (defensive)", () => {
    expect(dayAge(FIXED_NOW, dayOffset(FIXED_NOW, 5))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Health classifier
// ---------------------------------------------------------------------------

describe("Bureau reliability — classifyBureauHealth", () => {
  it("returns no_data when rate is null", () => {
    expect(classifyBureauHealth(null, 0)).toBe("no_data")
    expect(classifyBureauHealth(null, 100)).toBe("no_data")
  })

  it("returns no_data when totalSubmissions < MIN_SIGNAL_COUNT (suppresses noise)", () => {
    expect(
      classifyBureauHealth(0, BUREAU_RELIABILITY_MIN_SIGNAL_COUNT - 1)
    ).toBe("no_data")
    expect(
      classifyBureauHealth(1, BUREAU_RELIABILITY_MIN_SIGNAL_COUNT - 1)
    ).toBe("no_data")
  })

  it("classifies healthy at or above the degraded threshold", () => {
    expect(
      classifyBureauHealth(
        BUREAU_RELIABILITY_DEGRADED_THRESHOLD,
        BUREAU_RELIABILITY_MIN_SIGNAL_COUNT
      )
    ).toBe("healthy")
    expect(classifyBureauHealth(1, 100)).toBe("healthy")
  })

  it("classifies degraded between critical and degraded thresholds", () => {
    expect(
      classifyBureauHealth(
        BUREAU_RELIABILITY_CRITICAL_THRESHOLD,
        BUREAU_RELIABILITY_MIN_SIGNAL_COUNT
      )
    ).toBe("degraded")
    expect(classifyBureauHealth(0.9, 50)).toBe("degraded")
  })

  it("classifies critical strictly below the critical threshold", () => {
    expect(
      classifyBureauHealth(
        BUREAU_RELIABILITY_CRITICAL_THRESHOLD - 0.01,
        BUREAU_RELIABILITY_MIN_SIGNAL_COUNT
      )
    ).toBe("critical")
    expect(classifyBureauHealth(0, 100)).toBe("critical")
  })
})

// ---------------------------------------------------------------------------
// Composer — core projection
// ---------------------------------------------------------------------------

describe("Bureau reliability — computeBureauReliabilitySummary", () => {
  it("returns one row per known authority even when the input is empty", () => {
    const snapshot = computeBureauReliabilitySummary([], FIXED_NOW)
    expect(snapshot.perAuthority.length).toBe(
      BUREAU_RELIABILITY_AUTHORITIES.length
    )
    expect(snapshot.rowsConsidered).toBe(0)
    for (const row of snapshot.perAuthority) {
      expect(row.totalSubmissions).toBe(0)
      expect(row.deliverySuccessRate).toBeNull()
      expect(row.acknowledgementRate).toBeNull()
      expect(row.medianDeliveryDurationMs).toBeNull()
      expect(row.oldestPendingAckAgeDays).toBeNull()
      expect(row.health).toBe("no_data")
    }
  })

  it("preserves the canonical authority order in `perAuthority`", () => {
    const snapshot = computeBureauReliabilitySummary([], FIXED_NOW)
    expect(snapshot.perAuthority.map((r) => r.authority)).toEqual([
      ...BUREAU_RELIABILITY_AUTHORITIES,
    ])
  })

  it("excludes draft rows from the denominator (pre-pipeline)", () => {
    // 5 draft EPF rows shouldn't push KWSP off `no_data`
    const rows = Array.from({ length: 5 }, () =>
      makeRow({
        submissionState: "draft",
        deliveryState: null,
        deliveryDurationMs: null,
        deliveryCompletedAt: null,
      })
    )
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.totalSubmissions).toBe(0)
    expect(kwsp.deliverySuccessRate).toBeNull()
    expect(kwsp.health).toBe("no_data")
  })

  it("drops rows whose packType is unknown to STATUTORY_PACK_TO_AUTHORITY", () => {
    const snapshot = computeBureauReliabilitySummary(
      [
        makeRow({ packType: "non_existent_pack" }),
        makeRow({ packType: "epf_monthly" }),
      ],
      FIXED_NOW
    )
    expect(snapshot.rowsConsidered).toBe(1)
  })

  it("counts delivered / failed / pending and acknowledged from the right columns", () => {
    const rows: BureauReliabilityClassifierRow[] = [
      makeRow({ deliveryState: "delivered", submissionState: "acknowledged" }),
      makeRow({ deliveryState: "delivered", submissionState: "submitted" }),
      makeRow({
        deliveryState: "failed",
        submissionState: "failed",
        deliveryDurationMs: null,
      }),
      makeRow({
        deliveryState: "queued",
        submissionState: "queued",
        deliveryDurationMs: null,
      }),
      makeRow({
        deliveryState: null,
        submissionState: "queued",
        deliveryDurationMs: null,
      }),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.totalSubmissions).toBe(5)
    expect(kwsp.deliveredCount).toBe(2)
    expect(kwsp.failedCount).toBe(1)
    expect(kwsp.pendingCount).toBe(1)
    expect(kwsp.acknowledgedCount).toBe(1)
    expect(kwsp.deliverySuccessRate).toBe(2 / 5)
    expect(kwsp.acknowledgementRate).toBe(1 / 2)
  })

  it("partitions rows by authority via STATUTORY_PACK_TO_AUTHORITY", () => {
    const snapshot = computeBureauReliabilitySummary(
      [
        makeRow({ packType: "epf_monthly" }), // KWSP
        makeRow({ packType: "socso_monthly" }), // PERKESO
        makeRow({ packType: "eis_monthly" }), // PERKESO (shares with SOCSO)
        makeRow({ packType: "pcb_monthly" }), // LHDN
        makeRow({ packType: "ea_annual" }), // LHDN
      ],
      FIXED_NOW
    )
    const byAuthority = Object.fromEntries(
      snapshot.perAuthority.map((r) => [r.authority, r.totalSubmissions])
    )
    expect(byAuthority.KWSP).toBe(1)
    expect(byAuthority.PERKESO).toBe(2)
    expect(byAuthority.LHDN).toBe(2)
  })

  it("computes median latency only over delivered rows with finite durations", () => {
    const rows: BureauReliabilityClassifierRow[] = [
      makeRow({ deliveryState: "delivered", deliveryDurationMs: 100 }),
      makeRow({ deliveryState: "delivered", deliveryDurationMs: 300 }),
      makeRow({ deliveryState: "delivered", deliveryDurationMs: 500 }),
      // failed row's duration is ignored
      makeRow({
        deliveryState: "failed",
        deliveryDurationMs: 9999,
        submissionState: "failed",
      }),
      // null duration on a delivered row is ignored
      makeRow({
        deliveryState: "delivered",
        deliveryDurationMs: null,
      }),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.medianDeliveryDurationMs).toBe(300)
  })

  it("reports oldestPendingAckAgeDays only for submitted-but-not-acknowledged rows", () => {
    const rows: BureauReliabilityClassifierRow[] = [
      // submitted 5 days ago — eligible
      makeRow({
        submissionState: "submitted",
        updatedAt: dayOffset(FIXED_NOW, -5),
      }),
      // submitted 12 days ago — eligible AND oldest
      makeRow({
        submissionState: "submitted",
        updatedAt: dayOffset(FIXED_NOW, -12),
      }),
      // submitted 30 days ago BUT acknowledged — NOT eligible (already done)
      makeRow({
        submissionState: "acknowledged",
        updatedAt: dayOffset(FIXED_NOW, -30),
      }),
      // submitted 90 days ago BUT failed — NOT eligible (in failed bucket)
      makeRow({
        submissionState: "failed",
        deliveryState: "failed",
        updatedAt: dayOffset(FIXED_NOW, -90),
      }),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.oldestPendingAckAgeDays).toBe(12)
  })

  it("oldestPendingAckAgeDays is null when no submitted rows exist", () => {
    const rows: BureauReliabilityClassifierRow[] = [
      makeRow({ submissionState: "acknowledged" }),
      makeRow({
        submissionState: "failed",
        deliveryState: "failed",
      }),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.oldestPendingAckAgeDays).toBeNull()
  })

  it("uses the windowDays override when provided", () => {
    const snapshot = computeBureauReliabilitySummary([], FIXED_NOW, {
      windowDays: 7,
    })
    expect(snapshot.windowDays).toBe(7)
  })

  it("respects MIN_SIGNAL_COUNT when classifying with few samples", () => {
    // 1 delivered out of 1 = 100% but below MIN_SIGNAL_COUNT -> no_data
    const rows: BureauReliabilityClassifierRow[] = [
      makeRow({ deliveryState: "delivered" }),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.deliverySuccessRate).toBe(1)
    expect(kwsp.health).toBe("no_data")
  })

  it("classifies degraded when delivery rate dips below 95% with sufficient signal", () => {
    // 18 delivered + 2 failed = 90% over 20 rows -> degraded (≥ MIN_SIGNAL)
    const rows: BureauReliabilityClassifierRow[] = [
      ...Array.from({ length: 18 }, () =>
        makeRow({ deliveryState: "delivered" })
      ),
      ...Array.from({ length: 2 }, () =>
        makeRow({
          deliveryState: "failed",
          submissionState: "failed",
          deliveryDurationMs: null,
        })
      ),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.deliverySuccessRate).toBe(0.9)
    expect(kwsp.health).toBe("degraded")
  })

  it("classifies critical when delivery rate dips below 80%", () => {
    // 7 delivered + 3 failed = 70% -> critical
    const rows: BureauReliabilityClassifierRow[] = [
      ...Array.from({ length: 7 }, () =>
        makeRow({ deliveryState: "delivered" })
      ),
      ...Array.from({ length: 3 }, () =>
        makeRow({
          deliveryState: "failed",
          submissionState: "failed",
          deliveryDurationMs: null,
        })
      ),
    ]
    const snapshot = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const kwsp = snapshot.perAuthority.find((r) => r.authority === "KWSP")!
    expect(kwsp.deliverySuccessRate).toBe(0.7)
    expect(kwsp.health).toBe("critical")
  })

  it("snapshot is deterministic — same input + now yields identical output", () => {
    const rows: BureauReliabilityClassifierRow[] = [
      makeRow({ deliveryState: "delivered", deliveryDurationMs: 100 }),
      makeRow({ deliveryState: "delivered", deliveryDurationMs: 200 }),
      makeRow({
        deliveryState: "failed",
        submissionState: "failed",
        deliveryDurationMs: null,
      }),
    ]
    const a = computeBureauReliabilitySummary(rows, FIXED_NOW)
    const b = computeBureauReliabilitySummary(rows, FIXED_NOW)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
