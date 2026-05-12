import { describe, expect, it } from "vitest"

import {
  ageInDays,
  classifyComplianceEvidenceForOperationalHealth,
  COMPLIANCE_AGING_TIERS,
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
  COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS,
  COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS,
  complianceAgingTiersCrossed,
  complianceAgingTierThresholdDays,
  effectiveAgeAnchorForRow,
  highestComplianceAgingTier,
  isAttentionBucket,
  isComplianceOperationalHealthBucket,
  type ComplianceHealthClassifierRow,
  type ComplianceOperationalHealthBucket,
} from "../../lib/features/hrm/data/compliance-operational-health.shared"

/**
 * Phase 3L — golden tests for the operational health classifier.
 *
 * Locks the bucket enum, the aging thresholds, the anchor rules per
 * state, and the truth table that maps `(submissionState, ageDays,
 * periodIsLocked)` to the bucket the UI renders. Adding a new
 * `submissionState` to the schema MUST land here in the same commit —
 * otherwise the silent fall-through path will swallow the row into
 * `in_flight` without UI awareness.
 */

const NOW = new Date("2026-05-15T10:00:00.000Z")

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function row(
  overrides: Partial<ComplianceHealthClassifierRow>
): ComplianceHealthClassifierRow {
  return {
    id: "evidence-1",
    submissionState: "submitted",
    generatedAt: daysAgo(1),
    updatedAt: daysAgo(1),
    acknowledgedAt: null,
    periodIsLocked: false,
    ...overrides,
  }
}

describe("COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS", () => {
  it("freezes the operator-meaningful bucket enum", () => {
    // Order is meaningful — UI iterates this exact sequence for the
    // attention section. Bumping any of these requires explicit i18n
    // updates, classifier updates, AND a UI review.
    expect([...COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS]).toStrictEqual([
      "needs_attention_failing",
      "needs_attention_unsent",
      "needs_attention_stuck",
      "in_flight",
      "closed_recently",
      "closed",
      "draft_unlocked_period",
    ])
  })

  it("locks the attention sub-set", () => {
    expect([...COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS]).toStrictEqual([
      "needs_attention_failing",
      "needs_attention_unsent",
      "needs_attention_stuck",
    ])
  })
})

describe("isComplianceOperationalHealthBucket", () => {
  it("narrows known bucket strings", () => {
    for (const bucket of COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS) {
      expect(isComplianceOperationalHealthBucket(bucket)).toBe(true)
    }
  })

  it("rejects unknown / typo bucket strings", () => {
    expect(
      isComplianceOperationalHealthBucket("needs_attention_obviously")
    ).toBe(false)
    expect(isComplianceOperationalHealthBucket(undefined)).toBe(false)
    expect(isComplianceOperationalHealthBucket(null)).toBe(false)
    expect(isComplianceOperationalHealthBucket("")).toBe(false)
  })
})

describe("isAttentionBucket", () => {
  it("returns true only for the attention buckets", () => {
    for (const bucket of COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS) {
      const expected = (
        COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS as readonly string[]
      ).includes(bucket)
      expect(isAttentionBucket(bucket)).toBe(expected)
    }
  })
})

describe("ageInDays", () => {
  it("computes whole-day age (floor)", () => {
    expect(ageInDays(NOW, daysAgo(0))).toBe(0)
    expect(ageInDays(NOW, daysAgo(1))).toBe(1)
    expect(ageInDays(NOW, daysAgo(7))).toBe(7)
    expect(ageInDays(NOW, daysAgo(30))).toBe(30)
  })

  it("clamps clock-skewed future timestamps to 0", () => {
    const future = new Date(NOW.getTime() + 5_000)
    expect(ageInDays(NOW, future)).toBe(0)
  })

  it("does not return fractional days", () => {
    const halfDay = new Date(NOW.getTime() - 12 * 60 * 60 * 1000)
    // Half a day must still floor to 0, never 0.5.
    expect(ageInDays(NOW, halfDay)).toBe(0)
    const dayAndHalf = new Date(NOW.getTime() - 36 * 60 * 60 * 1000)
    expect(ageInDays(NOW, dayAndHalf)).toBe(1)
  })
})

describe("effectiveAgeAnchorForRow", () => {
  it("uses acknowledgedAt for acknowledged rows when present", () => {
    const ack = daysAgo(2)
    expect(
      effectiveAgeAnchorForRow(
        row({
          submissionState: "acknowledged",
          acknowledgedAt: ack,
          updatedAt: daysAgo(1),
        })
      )
    ).toBe(ack)
  })

  it("falls back to updatedAt when an acknowledged row has no acknowledgedAt (legacy data)", () => {
    const updated = daysAgo(2)
    expect(
      effectiveAgeAnchorForRow(
        row({
          submissionState: "acknowledged",
          acknowledgedAt: null,
          updatedAt: updated,
        })
      )
    ).toBe(updated)
  })

  it("uses generatedAt for draft rows", () => {
    const generated = daysAgo(20)
    expect(
      effectiveAgeAnchorForRow(
        row({
          submissionState: "draft",
          generatedAt: generated,
          updatedAt: daysAgo(1),
        })
      )
    ).toBe(generated)
  })

  it("uses updatedAt for in-flight / failed states (last transition)", () => {
    const updated = daysAgo(5)
    expect(
      effectiveAgeAnchorForRow(
        row({ submissionState: "submitted", updatedAt: updated })
      )
    ).toBe(updated)
    expect(
      effectiveAgeAnchorForRow(
        row({ submissionState: "failed", updatedAt: updated })
      )
    ).toBe(updated)
    expect(
      effectiveAgeAnchorForRow(
        row({ submissionState: "queued", updatedAt: updated })
      )
    ).toBe(updated)
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — failed state", () => {
  it("always lands in needs_attention_failing regardless of age or period state", () => {
    const cases = [0, 1, 7, 30].map((days) =>
      row({ submissionState: "failed", updatedAt: daysAgo(days) })
    )
    for (const r of cases) {
      const { bucket } = classifyComplianceEvidenceForOperationalHealth(r, NOW)
      expect(bucket).toBe("needs_attention_failing")
    }
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — draft state", () => {
  it("lands in needs_attention_unsent when the parent period is locked", () => {
    const r = row({
      submissionState: "draft",
      periodIsLocked: true,
      generatedAt: daysAgo(3),
    })
    const { bucket, ageDays } = classifyComplianceEvidenceForOperationalHealth(
      r,
      NOW
    )
    expect(bucket).toBe("needs_attention_unsent")
    expect(ageDays).toBe(3)
  })

  it("lands in draft_unlocked_period (NOT operator-attention) when the period is still open", () => {
    const r = row({
      submissionState: "draft",
      periodIsLocked: false,
      generatedAt: daysAgo(60),
    })
    const { bucket } = classifyComplianceEvidenceForOperationalHealth(r, NOW)
    expect(bucket).toBe("draft_unlocked_period")
    expect(isAttentionBucket(bucket)).toBe(false)
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — submitted state", () => {
  it("stays in_flight while age < STUCK_DAYS", () => {
    const r = row({
      submissionState: "submitted",
      updatedAt: daysAgo(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS - 1),
    })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "in_flight"
    )
  })

  it("flips to needs_attention_stuck at exactly STUCK_DAYS", () => {
    const r = row({
      submissionState: "submitted",
      updatedAt: daysAgo(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS),
    })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "needs_attention_stuck"
    )
  })

  it("stays needs_attention_stuck beyond STUCK_DAYS", () => {
    const r = row({
      submissionState: "submitted",
      updatedAt: daysAgo(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS + 30),
    })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "needs_attention_stuck"
    )
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — acknowledged state", () => {
  it("lands in closed_recently inside the recent window", () => {
    const r = row({
      submissionState: "acknowledged",
      acknowledgedAt: daysAgo(
        COMPLIANCE_OPERATIONAL_HEALTH_AGING.RECENT_ACK_DAYS
      ),
    })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "closed_recently"
    )
  })

  it("flips to closed once age exceeds RECENT_ACK_DAYS", () => {
    const r = row({
      submissionState: "acknowledged",
      acknowledgedAt: daysAgo(
        COMPLIANCE_OPERATIONAL_HEALTH_AGING.RECENT_ACK_DAYS + 1
      ),
    })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "closed"
    )
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — queued state", () => {
  it("treats queued rows as in_flight", () => {
    const r = row({ submissionState: "queued", updatedAt: daysAgo(2) })
    expect(classifyComplianceEvidenceForOperationalHealth(r, NOW).bucket).toBe(
      "in_flight"
    )
  })
})

describe("classifyComplianceEvidenceForOperationalHealth — unknown state", () => {
  it("falls back to in_flight without throwing", () => {
    // Forward-compat behavior: a future state ships in the schema before
    // the classifier learns about it. Surface it visibly (NOT silently
    // dropped) by parking it in `in_flight`. The test is here to prove
    // we never throw — adding new states still requires explicit
    // classification.
    const r = row({
      submissionState:
        "settled" as ComplianceHealthClassifierRow["submissionState"],
      updatedAt: daysAgo(1),
    })
    const { bucket } = classifyComplianceEvidenceForOperationalHealth(r, NOW)
    expect(bucket).toBe("in_flight")
  })
})

describe("aging policy invariants", () => {
  it("RECENT_ACK_DAYS is strictly greater than STUCK_DAYS", () => {
    // If these ever invert, an "acknowledged 5 days ago" row would
    // somehow be older than a "stuck 7 days" submitted row, breaking
    // the whole timeline UI semantics.
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.RECENT_ACK_DAYS).toBeGreaterThan(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
    )
  })

  it("thresholds are positive integers (catches accidental millis or signed regressions)", () => {
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS).toBeGreaterThan(0)
    expect(
      Number.isInteger(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS)
    ).toBe(true)
    expect(
      Number.isInteger(COMPLIANCE_OPERATIONAL_HEALTH_AGING.RECENT_ACK_DAYS)
    ).toBe(true)
  })

  it("severity tiers are MONOTONIC: STUCK < ESCALATED < CRITICAL", () => {
    // Phase 3O — invert this and the audit chain would emit
    // `critical` BEFORE `detected`, which would break the
    // "system records every tier crossed in order" invariant tested
    // in `tier-doctrine.crossings`.
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS).toBeLessThan(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS
    )
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS).toBeLessThan(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
    )
  })

  it("severity tier thresholds are positive integers", () => {
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS).toBeGreaterThan(
      0
    )
    expect(
      Number.isInteger(COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS)
    ).toBe(true)
    expect(COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS).toBeGreaterThan(0)
    expect(
      Number.isInteger(COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS)
    ).toBe(true)
  })
})

describe("Phase 3O — severity tier doctrine", () => {
  it("freezes the canonical tier order (lowest -> highest)", () => {
    expect([...COMPLIANCE_AGING_TIERS]).toStrictEqual([
      "detected",
      "escalated",
      "critical",
    ])
  })

  it("threshold lookup returns each tier's policy day count", () => {
    expect(complianceAgingTierThresholdDays("detected")).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
    )
    expect(complianceAgingTierThresholdDays("escalated")).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS
    )
    expect(complianceAgingTierThresholdDays("critical")).toBe(
      COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
    )
  })

  describe("highestComplianceAgingTier", () => {
    it("returns null below the lowest threshold", () => {
      expect(highestComplianceAgingTier(0)).toBeNull()
      expect(highestComplianceAgingTier(6)).toBeNull()
    })

    it("returns `detected` AT the STUCK_DAYS boundary (lte semantics)", () => {
      // Boundary discipline mirrors the classifier: `>= STUCK_DAYS`
      // qualifies. A 7-day-stuck row is `detected`, not `null`.
      expect(
        highestComplianceAgingTier(
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS
        )
      ).toBe("detected")
    })

    it("returns `escalated` AT the ESCALATED_DAYS boundary", () => {
      expect(
        highestComplianceAgingTier(
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS
        )
      ).toBe("escalated")
    })

    it("returns `critical` AT the CRITICAL_DAYS boundary", () => {
      expect(
        highestComplianceAgingTier(
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS
        )
      ).toBe("critical")
    })

    it("returns `critical` beyond CRITICAL_DAYS (does not regress)", () => {
      expect(
        highestComplianceAgingTier(
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS + 365
        )
      ).toBe("critical")
    })
  })

  describe("complianceAgingTiersCrossed", () => {
    it("returns empty when nothing has crossed", () => {
      expect(complianceAgingTiersCrossed(0)).toEqual([])
      expect(complianceAgingTiersCrossed(6)).toEqual([])
    })

    it("returns ALL crossed tiers in threshold-ascending order", () => {
      // Doctrine: a 35-day stuck row's audit chain reflects
      // detected -> escalated -> critical, in that order.
      expect(complianceAgingTiersCrossed(35)).toEqual([
        "detected",
        "escalated",
        "critical",
      ])
    })

    it("returns just `detected` between STUCK and ESCALATED", () => {
      const between = Math.floor(
        (COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS +
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS) /
          2
      )
      expect(complianceAgingTiersCrossed(between)).toEqual(["detected"])
    })

    it("returns `detected` + `escalated` between ESCALATED and CRITICAL", () => {
      const between = Math.floor(
        (COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS +
          COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS) /
          2
      )
      expect(complianceAgingTiersCrossed(between)).toEqual([
        "detected",
        "escalated",
      ])
    })

    it("`highestComplianceAgingTier` agrees with `complianceAgingTiersCrossed.at(-1)` everywhere", () => {
      // Cross-consistency: the two helpers are independent
      // implementations and must always agree on the highest
      // crossed tier (or both report `null` / empty).
      for (const days of [0, 1, 6, 7, 13, 14, 20, 29, 30, 100]) {
        const crossed = complianceAgingTiersCrossed(days)
        const highest = highestComplianceAgingTier(days)
        expect(highest).toBe(crossed.length === 0 ? null : crossed.at(-1))
      }
    })
  })
})

describe("attention bucket coverage", () => {
  it("every attention bucket is reachable from the classifier", () => {
    // Concrete fixture per attention bucket — fails loud if any
    // attention bucket becomes unreachable (e.g. someone deletes the
    // `failed` branch or the locked-draft branch).
    const reach: Partial<
      Record<ComplianceOperationalHealthBucket, ComplianceHealthClassifierRow>
    > = {
      needs_attention_failing: row({
        submissionState: "failed",
        updatedAt: daysAgo(1),
      }),
      needs_attention_unsent: row({
        submissionState: "draft",
        periodIsLocked: true,
        generatedAt: daysAgo(1),
      }),
      needs_attention_stuck: row({
        submissionState: "submitted",
        updatedAt: daysAgo(COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS),
      }),
    }
    for (const bucket of COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS) {
      const fixture = reach[bucket]
      expect(fixture, `missing fixture for ${bucket}`).toBeDefined()
      expect(
        classifyComplianceEvidenceForOperationalHealth(fixture!, NOW).bucket
      ).toBe(bucket)
    }
  })
})
