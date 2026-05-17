/**
 * Phase 3P + 3Q — Compliance aging tier fanout doctrine.
 *
 * Tests the PURE pieces of the fanout module: envelope shape,
 * forbidden-key gate, per-tier outcome-counter folding, and the
 * tier-aware event-type map. The DB-coupled pieces
 * (`fanoutAgingTierEvent`, `fanoutAgingCriticalEvent`) are exercised
 * end-to-end by the cron route in production; the pure logic is what
 * we golden-test so the outbound contract cannot drift silently.
 *
 * Doctrine being locked here:
 *   1. Every tier's event type is registered in the `ORG_EVENT_TYPES`
 *      allowlist exactly — the schema gate (`eventTypeSchema`) would
 *      reject any drift, but a contract test makes the failure mode
 *      obvious.
 *   2. The envelope payload carries OPERATIONAL FACETS only —
 *      severity tier, age, pack type, period id, country code, rule
 *      pack version. NEVER payroll bytes, NEVER PII.
 *   3. The envelope is deterministic given a candidate + tier — same
 *      input maps to byte-equal canonical JSON (the delivery
 *      pipeline's `payloadHash` depends on this).
 *   4. The outcome -> counter folding is exhaustive and pure: every
 *      `code` increments exactly one counter, `attempts` always
 *      increments, and the running total of typed counters always
 *      equals `attempts`.
 *   5. The per-tier counter map updates only the targeted tier — a
 *      `detected` outcome never bleeds into the `escalated` or
 *      `critical` counters.
 *   6. Phase 3P critical-only API surface continues to work as a
 *      thin alias for the tier-aware functions (back-compat).
 */
import { describe, expect, it } from "vitest"

import {
  HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES,
  HRM_FANOUT_FORBIDDEN_KEYS,
  buildAgingCriticalEventEnvelopeData,
  buildAgingTierEventEnvelopeData,
  emptyAgingCriticalFanoutCounters,
  emptyAgingTierFanoutCountersByTier,
  tallyAgingCriticalFanoutOutcome,
  tallyAgingTierFanoutOutcomeByTier,
  type AgingCriticalFanoutCounters,
  type AgingCriticalFanoutOutcome,
  type AgingTierFanoutOutcome,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-aging-fanout.server.ts"
import type { AgingWatchCandidate } from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-aging-watch.server.ts"
import {
  COMPLIANCE_AGING_TIERS,
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
  complianceAgingTierThresholdDays,
  type ComplianceAgingTier,
} from "../../lib/features/hrm/employee-management/compliance-regulatory-tracking/data/compliance-operational-health.shared.ts"
import { ORG_EVENT_TYPES } from "../../lib/features/org-admin/constants"

const FIXED_SUBMITTED_AT = new Date("2026-04-01T06:00:00.000Z") // ~41 days before 2026-05-12

function makeCandidate(
  overrides: Partial<AgingWatchCandidate> = {}
): AgingWatchCandidate {
  return {
    evidenceId: "11111111-2222-3333-4444-555555555555",
    organizationId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    periodId: "99999999-8888-7777-6666-555555555555",
    packType: "epf_monthly",
    countryCode: "MY",
    rulePackVersion: "my-2024-01",
    submittedSinceUpdatedAt: FIXED_SUBMITTED_AT,
    ageDays: 41,
    ...overrides,
  }
}

// Walks an arbitrary value depth-first, returning every key it sees.
// Used by the no-PII gate to verify the envelope has no forbidden keys
// no matter how deeply nested.
function collectAllKeys(value: unknown): string[] {
  const out: string[] = []
  if (Array.isArray(value)) {
    for (const entry of value) out.push(...collectAllKeys(entry))
    return out
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      out.push(key)
      out.push(...collectAllKeys(child))
    }
  }
  return out
}

describe("Phase 3P — fanout doctrine: event type allowlist", () => {
  it("critical tier event type is registered in ORG_EVENT_TYPES", () => {
    // The fanout cannot deliver an event type the schema gate rejects.
    // This makes the one-source-of-truth contract obvious.
    expect(ORG_EVENT_TYPES).toContain(
      HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES.critical
    )
  })

  it("critical tier event type uses the HRM domain namespace", () => {
    // The audit action lives under `erp.execution.*` (lifecycle namespace);
    // the event type lives under `erp.hrm.*` (product/subscription
    // namespace). Receivers subscribe to the product topic.
    const criticalType = HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES.critical
    expect(criticalType).toMatch(/^erp\.hrm\.compliance\./)
    expect(criticalType).not.toMatch(/^erp\.execution\./)
  })
})

describe("Phase 3P — fanout doctrine: forbidden-key gate", () => {
  it("HRM_FANOUT_FORBIDDEN_KEYS is the documented PII / payroll byte set", () => {
    // Mirrors the ESLint `afenda/hrm-pii-audit-metadata` gate plus the
    // payload byte categories the outbound envelope MUST never carry.
    // Adding a key here means the envelope test below also gets stricter.
    expect([...HRM_FANOUT_FORBIDDEN_KEYS].sort()).toEqual(
      [
        "bankAccountNumber",
        "employeeId",
        "employeeName",
        "employees",
        "icNumber",
        "nationalId",
        "passportNumber",
        "payload",
        "payrollBankAccount",
        "ssn",
        "taxIdentifierNumber",
      ].sort()
    )
  })
})

describe("Phase 3P — buildAgingCriticalEventEnvelopeData", () => {
  it("returns the documented operational facets", () => {
    const candidate = makeCandidate()
    const data = buildAgingCriticalEventEnvelopeData(candidate)
    expect(data).toEqual({
      evidenceId: candidate.evidenceId,
      countryCode: "MY",
      packType: "epf_monthly",
      rulePackVersion: "my-2024-01",
      periodId: candidate.periodId,
      severityTier: "critical",
      ageDays: 41,
      tierThresholdDays: COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS,
      submittedSinceUpdatedAt: FIXED_SUBMITTED_AT.toISOString(),
    })
  })

  it("is deterministic (same input -> same output)", () => {
    const candidate = makeCandidate()
    const a = buildAgingCriticalEventEnvelopeData(candidate)
    const b = buildAgingCriticalEventEnvelopeData(candidate)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("locks severityTier to 'critical' regardless of ageDays", () => {
    // Phase 3P is critical-only fanout. Even if a candidate carries an
    // ageDays that would qualify only `escalated`, the envelope this
    // module builds is for the CRITICAL event type — so the marker is
    // always "critical". Lower tiers do not have a fanout helper yet.
    const data = buildAgingCriticalEventEnvelopeData(
      makeCandidate({ ageDays: 14 })
    )
    expect(data.severityTier).toBe("critical")
    expect(data.ageDays).toBe(14)
  })

  it("tierThresholdDays equals CRITICAL_DAYS", () => {
    const data = buildAgingCriticalEventEnvelopeData(makeCandidate())
    expect(data.tierThresholdDays).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
    )
  })

  it("never emits a forbidden PII / payload key (deep walk)", () => {
    const data = buildAgingCriticalEventEnvelopeData(makeCandidate())
    const keys = collectAllKeys(data)
    for (const forbidden of HRM_FANOUT_FORBIDDEN_KEYS) {
      expect(
        keys,
        `forbidden key "${forbidden}" appeared in envelope payload`
      ).not.toContain(forbidden)
    }
  })

  it("preserves periodId as null when the candidate has no period", () => {
    // Defensive: future ad-hoc evidence (annual EA) may carry no
    // period; receivers must see a null, not a stringified "null"
    // or a missing key.
    const data = buildAgingCriticalEventEnvelopeData(
      makeCandidate({ periodId: null })
    )
    expect(data.periodId).toBeNull()
    expect("periodId" in data).toBe(true)
  })

  it("submittedSinceUpdatedAt is an ISO-8601 UTC string", () => {
    const data = buildAgingCriticalEventEnvelopeData(makeCandidate())
    expect(typeof data.submittedSinceUpdatedAt).toBe("string")
    expect(data.submittedSinceUpdatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
  })
})

describe("Phase 3P — emptyAgingCriticalFanoutCounters", () => {
  it("returns all zeros", () => {
    expect(emptyAgingCriticalFanoutCounters()).toEqual({
      attempts: 0,
      delivered: 0,
      deliveryFailed: 0,
      endpointNotConfigured: 0,
      signingKeyMissing: 0,
      errored: 0,
    })
  })

  it("is a fresh object on each call (no shared mutable state)", () => {
    const a = emptyAgingCriticalFanoutCounters()
    const b = emptyAgingCriticalFanoutCounters()
    expect(a).not.toBe(b)
  })
})

describe("Phase 3P — tallyAgingCriticalFanoutOutcome", () => {
  const cases: ReadonlyArray<{
    name: string
    outcome: AgingCriticalFanoutOutcome
    expected: keyof Omit<AgingCriticalFanoutCounters, "attempts">
  }> = [
    {
      name: "delivered",
      outcome: { code: "delivered", deliveryId: "d1" },
      expected: "delivered",
    },
    {
      name: "delivery_failed",
      outcome: {
        code: "delivery_failed",
        deliveryId: "d1",
        httpStatus: 503,
      },
      expected: "deliveryFailed",
    },
    {
      name: "endpoint_not_configured",
      outcome: { code: "endpoint_not_configured" },
      expected: "endpointNotConfigured",
    },
    {
      name: "signing_key_missing",
      outcome: { code: "signing_key_missing" },
      expected: "signingKeyMissing",
    },
    {
      name: "fanout_error",
      outcome: { code: "fanout_error", message: "boom" },
      expected: "errored",
    },
  ]

  for (const { name, outcome, expected } of cases) {
    it(`"${name}" increments only "attempts" and "${expected}"`, () => {
      const before = emptyAgingCriticalFanoutCounters()
      const after = tallyAgingCriticalFanoutOutcome(before, outcome)

      expect(after.attempts).toBe(1)
      expect(after[expected]).toBe(1)

      const otherKeys = (
        Object.keys(after) as (keyof AgingCriticalFanoutCounters)[]
      ).filter((k) => k !== "attempts" && k !== expected)
      for (const key of otherKeys) {
        expect(after[key], `expected ${key} to remain 0`).toBe(0)
      }
    })
  }

  it("never mutates the input (pure)", () => {
    const before = emptyAgingCriticalFanoutCounters()
    const beforeSnapshot = { ...before }
    tallyAgingCriticalFanoutOutcome(before, {
      code: "delivered",
      deliveryId: "d1",
    })
    expect(before).toEqual(beforeSnapshot)
  })

  it("typed counters always sum to attempts after N folds", () => {
    // Walk every outcome shape twice — exhaustively exercises the
    // switch and proves the `delivered + deliveryFailed + ... ===
    // attempts` invariant the cron route relies on for clean
    // operator dashboards.
    let acc = emptyAgingCriticalFanoutCounters()
    const outcomes: AgingCriticalFanoutOutcome[] = [
      ...cases.map((c) => c.outcome),
      ...cases.map((c) => c.outcome),
    ]
    for (const outcome of outcomes) {
      acc = tallyAgingCriticalFanoutOutcome(acc, outcome)
    }
    const typedSum =
      acc.delivered +
      acc.deliveryFailed +
      acc.endpointNotConfigured +
      acc.signingKeyMissing +
      acc.errored
    expect(acc.attempts).toBe(outcomes.length)
    expect(typedSum).toBe(acc.attempts)
  })
})

// ---------------------------------------------------------------------------
// Phase 3Q — tier-aware fanout doctrine
// ---------------------------------------------------------------------------

describe("Phase 3Q — tier-aware event-type map", () => {
  it("contains exactly one event type per canonical aging tier", () => {
    expect(Object.keys(HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES).sort()).toEqual(
      [...COMPLIANCE_AGING_TIERS].sort()
    )
  })

  it("each tier event type is registered in ORG_EVENT_TYPES", () => {
    // Same one-source-of-truth check as Phase 3P, now extended to all
    // three tiers. The schema gate would catch drift but the
    // doctrine test makes the failure mode obvious in CI.
    for (const tier of COMPLIANCE_AGING_TIERS) {
      expect(ORG_EVENT_TYPES).toContain(
        HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES[tier]
      )
    }
  })

  it("each tier event type uses the HRM compliance domain namespace", () => {
    // Audit actions live under `erp.execution.*` (lifecycle namespace);
    // event types live under `erp.hrm.compliance.*` (product namespace).
    for (const tier of COMPLIANCE_AGING_TIERS) {
      const eventType = HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES[tier]
      expect(eventType).toBe(`erp.hrm.compliance.aging.${tier}`)
    }
  })
})

describe("Phase 3Q — buildAgingTierEventEnvelopeData (per tier)", () => {
  for (const tier of COMPLIANCE_AGING_TIERS) {
    it(`tier="${tier}" emits the documented operational facets`, () => {
      const data = buildAgingTierEventEnvelopeData(makeCandidate(), tier)
      expect(data).toEqual({
        evidenceId: "11111111-2222-3333-4444-555555555555",
        countryCode: "MY",
        packType: "epf_monthly",
        rulePackVersion: "my-2024-01",
        periodId: "99999999-8888-7777-6666-555555555555",
        severityTier: tier,
        ageDays: 41,
        tierThresholdDays: complianceAgingTierThresholdDays(tier),
        submittedSinceUpdatedAt: FIXED_SUBMITTED_AT.toISOString(),
      })
    })

    it(`tier="${tier}" never emits a forbidden PII / payload key`, () => {
      const data = buildAgingTierEventEnvelopeData(makeCandidate(), tier)
      const keys = collectAllKeys(data)
      for (const forbidden of HRM_FANOUT_FORBIDDEN_KEYS) {
        expect(
          keys,
          `forbidden key "${forbidden}" appeared in tier="${tier}" envelope`
        ).not.toContain(forbidden)
      }
    })

    it(`tier="${tier}" is deterministic (same input -> same output)`, () => {
      const candidate = makeCandidate()
      const a = buildAgingTierEventEnvelopeData(candidate, tier)
      const b = buildAgingTierEventEnvelopeData(candidate, tier)
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    })

    it(`tier="${tier}" tierThresholdDays equals the doctrine threshold`, () => {
      const data = buildAgingTierEventEnvelopeData(makeCandidate(), tier)
      const expected =
        tier === "detected"
          ? COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
          : tier === "escalated"
            ? COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS
            : COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
      expect(data.tierThresholdDays).toBe(expected)
    })
  }

  it("Phase 3P alias produces byte-equal output to tier='critical'", () => {
    // The legacy Phase 3P helper must remain a thin wrapper, not a
    // separate implementation that could drift.
    const candidate = makeCandidate()
    const legacy = buildAgingCriticalEventEnvelopeData(candidate)
    const tier = buildAgingTierEventEnvelopeData(candidate, "critical")
    expect(JSON.stringify(legacy)).toBe(JSON.stringify(tier))
  })
})

describe("Phase 3Q — emptyAgingTierFanoutCountersByTier", () => {
  it("returns one zero counter per canonical tier", () => {
    const empty = emptyAgingTierFanoutCountersByTier()
    expect(Object.keys(empty).sort()).toEqual(
      [...COMPLIANCE_AGING_TIERS].sort()
    )
    for (const tier of COMPLIANCE_AGING_TIERS) {
      expect(empty[tier]).toEqual({
        attempts: 0,
        delivered: 0,
        deliveryFailed: 0,
        endpointNotConfigured: 0,
        signingKeyMissing: 0,
        errored: 0,
      })
    }
  })

  it("returns a fresh map on each call (no shared mutable state)", () => {
    const a = emptyAgingTierFanoutCountersByTier()
    const b = emptyAgingTierFanoutCountersByTier()
    expect(a).not.toBe(b)
    expect(a.detected).not.toBe(b.detected)
  })
})

describe("Phase 3Q — tallyAgingTierFanoutOutcomeByTier", () => {
  const tierCases: ReadonlyArray<{
    name: string
    outcome: AgingTierFanoutOutcome
  }> = [
    { name: "delivered", outcome: { code: "delivered", deliveryId: "d1" } },
    {
      name: "delivery_failed",
      outcome: { code: "delivery_failed", deliveryId: "d1", httpStatus: 503 },
    },
    {
      name: "endpoint_not_configured",
      outcome: { code: "endpoint_not_configured" },
    },
    { name: "signing_key_missing", outcome: { code: "signing_key_missing" } },
    {
      name: "fanout_error",
      outcome: { code: "fanout_error", message: "boom" },
    },
  ]

  for (const tier of COMPLIANCE_AGING_TIERS) {
    for (const { name, outcome } of tierCases) {
      it(`tier="${tier}" outcome="${name}" updates only that tier's counters`, () => {
        const before = emptyAgingTierFanoutCountersByTier()
        const after = tallyAgingTierFanoutOutcomeByTier(before, tier, outcome)

        // Targeted tier saw an attempt.
        expect(after[tier].attempts).toBe(1)

        // Other tiers untouched — the doctrine that tiers are
        // independent subscriptions depends on this.
        const otherTiers: ComplianceAgingTier[] = COMPLIANCE_AGING_TIERS.filter(
          (t) => t !== tier
        )
        for (const other of otherTiers) {
          expect(
            after[other],
            `tier="${other}" should be untouched when tier="${tier}" was tallied`
          ).toEqual({
            attempts: 0,
            delivered: 0,
            deliveryFailed: 0,
            endpointNotConfigured: 0,
            signingKeyMissing: 0,
            errored: 0,
          })
        }
      })
    }
  }

  it("never mutates the input map (pure)", () => {
    const before = emptyAgingTierFanoutCountersByTier()
    const beforeSnapshot = JSON.stringify(before)
    tallyAgingTierFanoutOutcomeByTier(before, "critical", {
      code: "delivered",
      deliveryId: "d1",
    })
    expect(JSON.stringify(before)).toBe(beforeSnapshot)
  })

  it("accumulates per-tier across multiple folds", () => {
    // Realistic scenario: in a single tick, a 35-day-stuck row
    // triggers detected + escalated + critical fanouts. Each tier
    // should land in exactly one counter slot — no cross-tier leak.
    let acc = emptyAgingTierFanoutCountersByTier()
    acc = tallyAgingTierFanoutOutcomeByTier(acc, "detected", {
      code: "delivered",
      deliveryId: "d1",
    })
    acc = tallyAgingTierFanoutOutcomeByTier(acc, "escalated", {
      code: "endpoint_not_configured",
    })
    acc = tallyAgingTierFanoutOutcomeByTier(acc, "critical", {
      code: "delivered",
      deliveryId: "d2",
    })

    expect(acc.detected.attempts).toBe(1)
    expect(acc.detected.delivered).toBe(1)
    expect(acc.escalated.attempts).toBe(1)
    expect(acc.escalated.endpointNotConfigured).toBe(1)
    expect(acc.critical.attempts).toBe(1)
    expect(acc.critical.delivered).toBe(1)

    // Per-tier sum invariant still holds for each tier.
    for (const tier of COMPLIANCE_AGING_TIERS) {
      const counters = acc[tier]
      const typedSum =
        counters.delivered +
        counters.deliveryFailed +
        counters.endpointNotConfigured +
        counters.signingKeyMissing +
        counters.errored
      expect(
        typedSum,
        `tier="${tier}" typed counters should sum to attempts`
      ).toBe(counters.attempts)
    }
  })
})

describe("Phase 3Q — Phase 3P back-compat surface", () => {
  it("emptyAgingCriticalFanoutCounters returns the same shape as a single tier slot", () => {
    const legacy = emptyAgingCriticalFanoutCounters()
    const tierEmpty = emptyAgingTierFanoutCountersByTier().critical
    expect(legacy).toEqual(tierEmpty)
  })

  // Type-only assertion: Phase 3P's `AgingCriticalFanoutCounters` must
  // still be a usable counter shape. Compiler enforcement at consumer
  // sites stays intact.
  it("AgingCriticalFanoutCounters remains a usable counter type alias", () => {
    const counters: AgingCriticalFanoutCounters =
      emptyAgingCriticalFanoutCounters()
    expect(counters.attempts).toBe(0)
  })
})
