/**
 * Phase 4 — Document expiry watch (system-observed crossings).
 *
 * Locks the PURE pieces of the cron tick:
 *   1. Tier classifier monotonicity — closer to expiry = strictly more
 *      tiers crossed.
 *   2. Per-tier idempotent partitioner — already-emitted tiers do not
 *      re-emit, but missing tiers in the same row still emit on this
 *      tick.
 *   3. Audit metadata is operational facets only — no payload, no PII,
 *      no document bytes.
 *   4. Tier audit action strings are frozen — dashboards and audit
 *      extractors read these exact tokens.
 */
import { describe, expect, it } from "vitest"

import {
  buildDocumentExpiryAuditMetadata,
  computeDocumentExpiryCutoff,
  daysToExpiry,
  DOCUMENT_EXPIRY_LOOKAHEAD_DAYS,
  DOCUMENT_EXPIRY_TIERS,
  DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS,
  DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS,
  DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT,
  documentExpiryTiersCrossed,
  partitionDocumentExpiryEmissions,
  type DocumentExpiryCandidate,
} from "../../lib/features/hrm/data/document-expiry-watch.shared"

const FIXED_NOW = new Date("2026-05-12T06:00:00.000Z")
const MS_PER_DAY = 24 * 60 * 60 * 1000

function dayOffset(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY)
}

function makeCandidate(
  overrides: Partial<DocumentExpiryCandidate> = {}
): DocumentExpiryCandidate {
  return {
    documentId: "doc-1",
    organizationId: "org-1",
    employeeId: "emp-1",
    documentType: "work_permit",
    title: "Work Permit",
    effectiveTo: dayOffset(FIXED_NOW, 10),
    daysToExpiry: 10,
    ...overrides,
  }
}

describe("Document expiry watch — wiring", () => {
  it("freezes the tier audit action strings", () => {
    expect(DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS).toEqual({
      warning_30d: "erp.hrm.document.expiry_warning_30d",
      warning_14d: "erp.hrm.document.expiry_warning_14d",
      critical_7d: "erp.hrm.document.expiry_critical_7d",
    })
  })

  it("audit map covers exactly the canonical tier set", () => {
    expect(Object.keys(DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS).sort()).toEqual(
      [...DOCUMENT_EXPIRY_TIERS].sort()
    )
  })

  it("threshold map is monotonically decreasing across the tier order", () => {
    const ordered = DOCUMENT_EXPIRY_TIERS.map(
      (t) => DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS[t]
    )
    expect(ordered).toEqual([30, 14, 7])
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]).toBeLessThan(ordered[i - 1] ?? Infinity)
    }
  })

  it("lookahead horizon equals the largest tier threshold", () => {
    expect(DOCUMENT_EXPIRY_LOOKAHEAD_DAYS).toBe(
      DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS.warning_30d
    )
  })

  it("batch limit fits a Vercel cron tick even at three writes per row", () => {
    expect(DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT).toBeGreaterThan(0)
    expect(DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT).toBeLessThanOrEqual(200)
    expect(
      DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT * DOCUMENT_EXPIRY_TIERS.length
    ).toBeLessThanOrEqual(300)
  })
})

describe("Document expiry watch — pure helpers", () => {
  it("computes the cutoff exactly 30 days ahead of `now`", () => {
    const cutoff = computeDocumentExpiryCutoff(FIXED_NOW)
    expect(cutoff.getTime() - FIXED_NOW.getTime()).toBe(
      DOCUMENT_EXPIRY_LOOKAHEAD_DAYS * MS_PER_DAY
    )
  })

  it("daysToExpiry is the integer day count, negative when expired", () => {
    expect(daysToExpiry(FIXED_NOW, dayOffset(FIXED_NOW, 10))).toBe(10)
    expect(daysToExpiry(FIXED_NOW, dayOffset(FIXED_NOW, 0.5))).toBe(0)
    expect(daysToExpiry(FIXED_NOW, dayOffset(FIXED_NOW, -3))).toBe(-3)
  })

  it("documentExpiryTiersCrossed is monotonic across thresholds", () => {
    expect(documentExpiryTiersCrossed(31)).toEqual([])
    expect(documentExpiryTiersCrossed(30)).toEqual([])
    expect(documentExpiryTiersCrossed(29)).toEqual(["warning_30d"])
    expect(documentExpiryTiersCrossed(15)).toEqual(["warning_30d"])
    expect(documentExpiryTiersCrossed(13)).toEqual([
      "warning_30d",
      "warning_14d",
    ])
    expect(documentExpiryTiersCrossed(7)).toEqual([
      "warning_30d",
      "warning_14d",
    ])
    expect(documentExpiryTiersCrossed(6)).toEqual([
      "warning_30d",
      "warning_14d",
      "critical_7d",
    ])
    expect(documentExpiryTiersCrossed(-1)).toEqual([
      "warning_30d",
      "warning_14d",
      "critical_7d",
    ])
  })
})

describe("Document expiry watch — partition", () => {
  it("emits all three tiers in one tick when the row is observed late", () => {
    const candidate = makeCandidate({
      effectiveTo: dayOffset(FIXED_NOW, 5),
      daysToExpiry: 5,
    })
    const { toEmit, fullyAudited } = partitionDocumentExpiryEmissions(
      [candidate],
      new Map()
    )
    expect(fullyAudited).toEqual([])
    expect(toEmit.map((e) => e.tier)).toEqual([
      "warning_30d",
      "warning_14d",
      "critical_7d",
    ])
  })

  it("respects already-audited tiers and only emits the missing ones", () => {
    const candidate = makeCandidate({
      effectiveTo: dayOffset(FIXED_NOW, 5),
      daysToExpiry: 5,
    })
    const already = new Map<string, Set<string>>([
      [
        candidate.documentId,
        new Set([
          DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS.warning_30d,
          DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS.warning_14d,
        ]),
      ],
    ])
    const { toEmit, fullyAudited } = partitionDocumentExpiryEmissions(
      [candidate],
      already
    )
    expect(fullyAudited).toEqual([])
    expect(toEmit.map((e) => e.tier)).toEqual(["critical_7d"])
  })

  it("treats a candidate with all qualifying tiers already audited as fullyAudited", () => {
    const candidate = makeCandidate({
      effectiveTo: dayOffset(FIXED_NOW, 5),
      daysToExpiry: 5,
    })
    const already = new Map<string, Set<string>>([
      [
        candidate.documentId,
        new Set(Object.values(DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS)),
      ],
    ])
    const { toEmit, fullyAudited } = partitionDocumentExpiryEmissions(
      [candidate],
      already
    )
    expect(toEmit).toEqual([])
    expect(fullyAudited).toEqual([candidate])
  })

  it("ignores candidates that have not crossed any tier yet", () => {
    const candidate = makeCandidate({
      effectiveTo: dayOffset(FIXED_NOW, 45),
      daysToExpiry: 45,
    })
    const { toEmit, fullyAudited } = partitionDocumentExpiryEmissions(
      [candidate],
      new Map()
    )
    expect(toEmit).toEqual([])
    expect(fullyAudited).toEqual([])
  })
})

describe("Document expiry watch — audit metadata", () => {
  it("contains operational facets only (no document bytes, no PII)", () => {
    const candidate = makeCandidate({
      documentId: "doc-42",
      employeeId: "emp-42",
      documentType: "work_permit",
      title: "MY Work Permit 2026",
      effectiveTo: dayOffset(FIXED_NOW, 6),
      daysToExpiry: 6,
    })
    const meta = buildDocumentExpiryAuditMetadata(candidate, "critical_7d")
    expect(meta).toEqual({
      documentId: "doc-42",
      documentType: "work_permit",
      employeeId: "emp-42",
      title: "MY Work Permit 2026",
      effectiveTo: candidate.effectiveTo.toISOString(),
      daysToExpiry: 6,
      severityTier: "critical_7d",
      tierThresholdDays: 7,
      trigger: "cron:hrm-document-expiry-watch",
    })
  })

  it("metadata never carries any document blob bytes or signing material", () => {
    const candidate = makeCandidate()
    const meta = buildDocumentExpiryAuditMetadata(candidate, "warning_30d")
    const banned = ["blobUrl", "payloadHash", "signedAt", "signedByUserId"]
    for (const key of banned) {
      expect(meta).not.toHaveProperty(key)
    }
  })
})
