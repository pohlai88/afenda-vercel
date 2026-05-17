/**
 * Phase 3M + 3O — Compliance aging watch (system-observed crossings).
 *
 * Tests the PURE pieces of the cron tick: threshold math, per-tier
 * idempotent partitioner, and metadata builder. The DB-coupled pieces
 * (`listAgingWatchCandidates`, `runComplianceAgingWatchTick`) are
 * exercised end-to-end by the cron route in production; the pure
 * logic is what we golden-test so the operational doctrine cannot
 * drift silently.
 *
 * Doctrine being locked here:
 *   1. The threshold cutoff is the EXACT
 *      `STUCK_DAYS * 24h` window relative to `now` — the SQL fetch
 *      uses the lowest tier; higher tiers are derived from each
 *      candidate's `ageDays` after the fetch (one DB pass, not three).
 *   2. Tier emissions are independent — a row that's 35 days stuck on
 *      its first observation gets ALL THREE tier audits in the same
 *      tick. Each tier is idempotent per evidence row (one row per
 *      tier, ever).
 *   3. The audit metadata is intentionally minimal — no payload, no
 *      PII, no bureau-specific bytes. Only operational facets.
 *   4. The tier classifier is monotonic and threshold-correct (held
 *      via `tier-doctrine.boundaries` in the operational-health
 *      shared test).
 */
import { describe, expect, it } from "vitest"

import {
  buildAgingAuditMetadata,
  computeAgingThresholdAt,
  partitionAgingTierEmissions,
  STATUTORY_AGING_WATCH_AUDIT_ACTION,
  STATUTORY_AGING_WATCH_AUDIT_ACTIONS,
  STATUTORY_AGING_WATCH_BATCH_LIMIT,
  tierEmissionsForCandidate,
  type AgingWatchCandidate,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-aging-watch.server.ts"
import {
  COMPLIANCE_AGING_TIERS,
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-operational-health.shared.ts"
import { EXECUTION_AUDIT_ACTIONS } from "../../lib/features/execution/execution.contract"

const FIXED_NOW = new Date("2026-05-12T06:00:00.000Z")

function dayOffset(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

function makeCandidate(
  overrides: Partial<AgingWatchCandidate> = {}
): AgingWatchCandidate {
  // Spread `overrides` so explicit `null` / `undefined` values win
  // over defaults (the ?? operator would coerce explicit nulls).
  return {
    evidenceId: "evidence-1",
    organizationId: "org-1",
    periodId: "period-1",
    packType: "epf_monthly",
    countryCode: "MY",
    rulePackVersion: "my.payroll.2024-08.v1",
    submittedSinceUpdatedAt: dayOffset(FIXED_NOW, -10),
    ageDays: 10,
    ...overrides,
  }
}

describe("Compliance aging watch — wiring", () => {
  it("legacy single-action export still resolves to the canonical detected string", () => {
    // Phase 3M consumers (and the timeline mapping module) reference
    // `STATUTORY_AGING_WATCH_AUDIT_ACTION` directly. Phase 3O kept it
    // as an alias for the lowest tier to avoid a breaking rename.
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTION).toBe(
      EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_DETECTED
    )
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTION).toBe(
      "erp.execution.statutory_submission.aging.detected"
    )
  })

  it("per-tier audit map is sourced from the execution contract", () => {
    // Doctrine: the cron MUST emit using the canonical execution
    // audit strings. If a contract drift moves a string, the timeline
    // mapping + dashboards must be updated in lockstep — this
    // assertion is the canary.
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTIONS).toEqual({
      detected: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_DETECTED,
      escalated: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_ESCALATED,
      critical: EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_CRITICAL,
    })
    // Frozen string values — dashboards and audit grep extractors
    // depend on these exact tokens.
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected).toBe(
      "erp.execution.statutory_submission.aging.detected"
    )
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTIONS.escalated).toBe(
      "erp.execution.statutory_submission.aging.escalated"
    )
    expect(STATUTORY_AGING_WATCH_AUDIT_ACTIONS.critical).toBe(
      "erp.execution.statutory_submission.aging.critical"
    )
  })

  it("audit map covers exactly the canonical tier set", () => {
    expect(Object.keys(STATUTORY_AGING_WATCH_AUDIT_ACTIONS).sort()).toEqual(
      [...COMPLIANCE_AGING_TIERS].sort()
    )
  })

  it("batch limit fits a Vercel cron tick even at three writes per row", () => {
    expect(STATUTORY_AGING_WATCH_BATCH_LIMIT).toBeGreaterThan(0)
    // 60s `maxDuration` budget; one IAM audit insert is ~5–20ms; cap
    // well under the worst-case so a single bad insert latency cannot
    // tip the cron over even when every row emits all three tiers.
    expect(STATUTORY_AGING_WATCH_BATCH_LIMIT).toBeLessThanOrEqual(200)
    expect(
      STATUTORY_AGING_WATCH_BATCH_LIMIT * COMPLIANCE_AGING_TIERS.length
    ).toBeLessThanOrEqual(300)
  })
})

describe("Compliance aging watch — threshold math", () => {
  it("computes the cutoff exactly STUCK_DAYS before `now`", () => {
    // The SQL fetch uses the LOWEST tier threshold; higher tiers are
    // derived from each candidate's ageDays after the fetch. Locking
    // this prevents a future "let's pre-filter to ESCALATED rows
    // only" change from accidentally hiding lower-tier crossings.
    const cutoff = computeAgingThresholdAt(FIXED_NOW)
    const expected = new Date(
      FIXED_NOW.getTime() -
        COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS * 24 * 60 * 60 * 1000
    )
    expect(cutoff.toISOString()).toBe(expected.toISOString())
  })

  it("is monotonic — `cutoff(now)` advances when `now` advances", () => {
    const cutoffA = computeAgingThresholdAt(FIXED_NOW)
    const cutoffB = computeAgingThresholdAt(dayOffset(FIXED_NOW, 1))
    expect(cutoffB.getTime()).toBeGreaterThan(cutoffA.getTime())
  })
})

describe("Compliance aging watch — per-candidate tier emission decision", () => {
  it("emits NO tiers when the row is below the lowest threshold", () => {
    const candidate = makeCandidate({ ageDays: 6 })
    expect(tierEmissionsForCandidate(candidate, new Set())).toEqual([])
  })

  it("emits only `detected` at the STUCK_DAYS boundary", () => {
    const candidate = makeCandidate({ ageDays: 7 })
    expect(tierEmissionsForCandidate(candidate, new Set())).toEqual([
      "detected",
    ])
  })

  it("emits `detected` + `escalated` at the ESCALATED_DAYS boundary", () => {
    // First-observation correctness: a row that crossed the boundary
    // before the cron ever observed it gets BOTH lower-tier audits.
    // Doctrine: the system records every tier it observed crossed,
    // not just the highest.
    const candidate = makeCandidate({ ageDays: 14 })
    expect(tierEmissionsForCandidate(candidate, new Set())).toEqual([
      "detected",
      "escalated",
    ])
  })

  it("emits all three tiers when a deeply stuck row is first observed", () => {
    const candidate = makeCandidate({ ageDays: 35 })
    expect(tierEmissionsForCandidate(candidate, new Set())).toEqual([
      "detected",
      "escalated",
      "critical",
    ])
  })

  it("dedups against already-emitted tier actions", () => {
    const candidate = makeCandidate({ ageDays: 35 })
    const already = new Set<string>([
      STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected,
      STATUTORY_AGING_WATCH_AUDIT_ACTIONS.escalated,
    ])
    // Only `critical` remains to be emitted — the row has been
    // observed before, but never at the highest tier yet.
    expect(tierEmissionsForCandidate(candidate, already)).toEqual(["critical"])
  })

  it("returns an empty array when every qualifying tier is already audited", () => {
    const candidate = makeCandidate({ ageDays: 35 })
    const already = new Set<string>(
      Object.values(STATUTORY_AGING_WATCH_AUDIT_ACTIONS)
    )
    expect(tierEmissionsForCandidate(candidate, already)).toEqual([])
  })

  it("is idempotent — repeated invocation with the same input is stable", () => {
    const candidate = makeCandidate({ ageDays: 20 })
    const first = tierEmissionsForCandidate(candidate, new Set())
    const second = tierEmissionsForCandidate(candidate, new Set())
    expect(first).toEqual(second)
  })

  it("preserves threshold-ascending order regardless of input set membership", () => {
    // The output order is meaningful — writers iterate it sequentially
    // so the audit chain reflects "lowest tier first" if both go in
    // on the same tick.
    const candidate = makeCandidate({ ageDays: 35 })
    const out = tierEmissionsForCandidate(candidate, new Set())
    const indices = out.map((tier) => COMPLIANCE_AGING_TIERS.indexOf(tier))
    const sorted = [...indices].sort((a, b) => a - b)
    expect(indices).toEqual(sorted)
  })
})

describe("Compliance aging watch — bulk partitioner", () => {
  it("routes ALL emissions when nothing was previously audited", () => {
    const candidates = [
      makeCandidate({ evidenceId: "a", ageDays: 8 }), // detected only
      makeCandidate({ evidenceId: "b", ageDays: 16 }), // detected + escalated
      makeCandidate({ evidenceId: "c", ageDays: 31 }), // all three
    ]
    const result = partitionAgingTierEmissions(candidates, new Map())
    // Three writes for `c`, two for `b`, one for `a` => six total.
    expect(result.toEmit).toHaveLength(6)
    expect(result.fullyAudited).toEqual([])
    // Per-row, lowest tier comes first (writer-side audit chain
    // ordering when both go in on the same tick).
    expect(
      result.toEmit.map((e) => `${e.candidate.evidenceId}:${e.tier}`)
    ).toEqual([
      "a:detected",
      "b:detected",
      "b:escalated",
      "c:detected",
      "c:escalated",
      "c:critical",
    ])
  })

  it("classifies fully-audited candidates into `fullyAudited`", () => {
    // A 10-day stuck row that already has a `detected` audit should
    // be considered fully audited (escalated/critical thresholds are
    // not crossed yet).
    const candidates = [
      makeCandidate({ evidenceId: "a", ageDays: 10 }),
      makeCandidate({ evidenceId: "b", ageDays: 16 }),
    ]
    const map = new Map<string, Set<string>>([
      ["a", new Set([STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected])],
      [
        "b",
        new Set([
          STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected,
          STATUTORY_AGING_WATCH_AUDIT_ACTIONS.escalated,
        ]),
      ],
    ])
    const result = partitionAgingTierEmissions(candidates, map)
    expect(result.toEmit).toEqual([])
    expect(result.fullyAudited.map((c) => c.evidenceId)).toEqual(["a", "b"])
  })

  it("treats absence in the map as an empty set (no nulls leak)", () => {
    const candidates = [makeCandidate({ evidenceId: "ghost", ageDays: 8 })]
    // No entry for `ghost` in the map — partitioner must NOT crash;
    // emit `detected` since nothing's been audited yet.
    const result = partitionAgingTierEmissions(candidates, new Map())
    expect(result.toEmit).toHaveLength(1)
    expect(result.toEmit[0]?.tier).toBe("detected")
    expect(result.fullyAudited).toEqual([])
  })

  it("partition is exhaustive — every candidate ends up in exactly one bucket", () => {
    const candidates = [
      makeCandidate({ evidenceId: "a", ageDays: 8 }), // toEmit
      makeCandidate({ evidenceId: "b", ageDays: 8 }), // fullyAudited
      makeCandidate({ evidenceId: "c", ageDays: 35 }), // toEmit (mixed)
    ]
    const map = new Map<string, Set<string>>([
      ["b", new Set([STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected])],
      [
        "c",
        new Set([
          STATUTORY_AGING_WATCH_AUDIT_ACTIONS.detected,
          STATUTORY_AGING_WATCH_AUDIT_ACTIONS.escalated,
        ]),
      ],
    ])
    const { toEmit, fullyAudited } = partitionAgingTierEmissions(
      candidates,
      map
    )
    const emittedIds = new Set(toEmit.map((e) => e.candidate.evidenceId))
    const fullIds = new Set(fullyAudited.map((c) => c.evidenceId))
    // Doctrine: a candidate is EITHER `toEmit` OR `fullyAudited`; it
    // cannot be in both partitions, even if other rows for the same
    // evidence id exist (impossible here — id is unique).
    expect([...emittedIds].some((id) => fullIds.has(id))).toBe(false)
    const reunion = new Set([...emittedIds, ...fullIds])
    expect(reunion.size).toBe(candidates.length)
  })

  it("does not mutate the inputs", () => {
    const candidates = [makeCandidate({ evidenceId: "a", ageDays: 8 })]
    const map = new Map<string, Set<string>>()
    const snapshot = JSON.parse(JSON.stringify(candidates))
    partitionAgingTierEmissions(candidates, map)
    expect(JSON.parse(JSON.stringify(candidates))).toEqual(snapshot)
    expect(map.size).toBe(0)
  })
})

describe("Compliance aging watch — audit metadata builder", () => {
  it("includes the operational facets and severity tier (no payload, no PII)", () => {
    const candidate = makeCandidate({
      evidenceId: "evidence-meta",
      packType: "socso_monthly",
      countryCode: "MY",
      rulePackVersion: "my.payroll.2024-08.v3",
      periodId: "period-7",
      ageDays: 11,
    })
    const meta = buildAgingAuditMetadata(candidate, "detected")
    expect(meta).toEqual({
      packType: "socso_monthly",
      countryCode: "MY",
      rulePackVersion: "my.payroll.2024-08.v3",
      periodId: "period-7",
      ageDays: 11,
      bucketBefore: "in_flight",
      bucketAfter: "needs_attention_stuck",
      severityTier: "detected",
      tierThresholdDays: COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS,
      stuckThresholdDays: COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS,
      trigger: "cron:hrm-compliance-aging-watch",
    })
  })

  it("threads the per-tier threshold for higher severity emissions", () => {
    // `tierThresholdDays` is the THIS-ROW threshold (escalated:
    // ESCALATED_DAYS); `stuckThresholdDays` is the legacy
    // lowest-tier facet retained for backwards-compat with Phase 3M
    // grep extractors.
    const candidate = makeCandidate({ ageDays: 18 })
    const meta = buildAgingAuditMetadata(candidate, "escalated")
    expect(meta.severityTier).toBe("escalated")
    expect(meta.tierThresholdDays).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS
    )
    expect(meta.stuckThresholdDays).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
    )
  })

  it("emits the critical tier threshold when the row crosses CRITICAL_DAYS", () => {
    const candidate = makeCandidate({ ageDays: 33 })
    const meta = buildAgingAuditMetadata(candidate, "critical")
    expect(meta.severityTier).toBe("critical")
    expect(meta.tierThresholdDays).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
    )
  })

  it("never embeds the evidence id, organization id, or actor data", () => {
    const candidate = makeCandidate({
      evidenceId: "should-not-appear",
      organizationId: "should-not-appear-either",
    })
    const meta = buildAgingAuditMetadata(candidate, "detected")
    const serialized = JSON.stringify(meta)
    // The evidence id flows through `resourceId` on the audit row;
    // the organization id flows through `organizationId`. Re-encoding
    // them in `metadata` would either leak data or invite drift
    // between the structured columns and the JSONB blob.
    expect(serialized).not.toContain("should-not-appear")
  })

  it("encodes the operational state transition explicitly", () => {
    const meta = buildAgingAuditMetadata(makeCandidate(), "detected")
    expect(meta.bucketBefore).toBe("in_flight")
    expect(meta.bucketAfter).toBe("needs_attention_stuck")
  })
})
