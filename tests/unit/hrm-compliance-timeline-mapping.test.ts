/**
 * Phase 3K — Compliance evidence lifecycle timeline mapping.
 *
 * Locks the canonical `iam_audit_event.action` -> timeline kind mapping that
 * powers the per-evidence drill-down at
 * `/o/{orgSlug}/dashboard/hrm/compliance/[evidenceId]`.
 *
 * Why golden-test the mapping table:
 *   - Audit strings are public API (regulator dashboards, log drains).
 *   - The composer fetches by `inArray(action, COMPLIANCE_TIMELINE_AUDIT_ACTIONS)`
 *     — drift between the SQL filter and the resolver would cause silent
 *     "fetched but unmapped" rows that drop off the timeline.
 *   - The mapping is BUILT FROM `STATUTORY_PACK_TO_EVENT_TYPE` and
 *     `STATUTORY_PACK_TO_ACK_EVENT_TYPE`, so adding a new statutory pack
 *     forces the timeline to absorb its lifecycle automatically. These
 *     tests freeze that contract.
 */
import { describe, expect, it } from "vitest"

import {
  COMPLIANCE_AUDIT_ACTION_TO_KIND,
  COMPLIANCE_TIMELINE_AUDIT_ACTIONS,
  COMPLIANCE_TIMELINE_KINDS,
  STATUTORY_PACK_EXPORT_AUDIT_ACTION,
  STATUTORY_PACK_REGENERATE_AUDIT_ACTION,
  complianceTimelineKindForAuditAction,
  isComplianceTimelineKind,
} from "../../lib/features/hrm/data/compliance-timeline.shared"
import {
  STATUTORY_PACK_TO_ACK_EVENT_TYPE,
  STATUTORY_PACK_TO_EVENT_TYPE,
} from "../../lib/features/hrm/data/statutory-event-types.shared"
import { EXECUTION_AUDIT_ACTIONS } from "../../lib/features/execution/execution.contract"

describe("Compliance timeline kind enumeration", () => {
  it("is the closed set of kinds backed by real writers", () => {
    expect([...COMPLIANCE_TIMELINE_KINDS].sort()).toEqual([
      "acknowledged",
      // Phase 3O — three independent severity tiers, all backed by
      // the aging-watch cron. Adding a new tier requires updating
      // `COMPLIANCE_AGING_TIERS`, the writer, this test, the i18n
      // catalog, AND the timeline UI in the same commit.
      "aging_critical",
      // Phase 3M — system-observed aging crossing (lowest tier).
      "aging_detected",
      "aging_escalated",
      "delivery_failed",
      "generated",
      // Phase 3T — operator-issued export download (chain of custody).
      // Backed by `app/api/integrations/hrm-statutory-pack-export/[evidenceId]/route.ts`.
      "pack_exported",
      // Phase 3U — in-place regeneration that overwrote a different
      // `inputHash`. Emitted by the producer Server Actions
      // (generateStatutoryPackAction / generateAllStatutoryPacksAction)
      // when `upsertComplianceEvidenceMutation` returns a non-null
      // `prior` snapshot. Idempotent re-submits do NOT emit this kind.
      "regenerated",
      "retry_attempted",
      "retry_exhausted",
      "submitted_to_bureau",
    ])
  })

  it("isComplianceTimelineKind narrows correctly", () => {
    expect(isComplianceTimelineKind("acknowledged")).toBe(true)
    expect(isComplianceTimelineKind("not_a_kind")).toBe(false)
    expect(isComplianceTimelineKind(null)).toBe(false)
    expect(isComplianceTimelineKind(undefined)).toBe(false)
    // Phase 3T — `pack_exported` flipped from "intentionally not a kind"
    // to a first-class lifecycle event when the export route shipped.
    expect(isComplianceTimelineKind("pack_exported")).toBe(true)
    // Phase 3U — `regenerated` flipped from "intentionally not a kind"
    // to a first-class lifecycle event when the producer Server Actions
    // started emitting `erp.hrm.compliance_pack.regenerate` after an
    // upsert reported a non-null prior snapshot.
    expect(isComplianceTimelineKind("regenerated")).toBe(true)
    // Doctrine: future kinds (delivery_succeeded, accepted, settled)
    // require a writer + i18n key + this assertion to grow in the same
    // commit. Today they are intentionally NOT timeline kinds.
    expect(isComplianceTimelineKind("delivery_succeeded")).toBe(false)
  })
})

describe("Audit action -> timeline kind mapping", () => {
  it("maps every retry/delivery execution audit action to the correct kind", () => {
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_DELIVERY_FAILED
      ]
    ).toBe("delivery_failed")
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_ATTEMPTED
      ]
    ).toBe("retry_attempted")
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_EXHAUSTED
      ]
    ).toBe("retry_exhausted")
    // Phase 3M / 3O — system-observed aging crossings must round-trip
    // through the same EXECUTION_AUDIT_ACTIONS namespace as the rest
    // of the system-observed lifecycle events. Each tier has its own
    // dedicated kind; collapsing them into a single kind would lose
    // the severity signal HR (and downstream pressure projection)
    // depends on.
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_DETECTED
      ]
    ).toBe("aging_detected")
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_ESCALATED
      ]
    ).toBe("aging_escalated")
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[
        EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_CRITICAL
      ]
    ).toBe("aging_critical")
    // Phase 3T — operator-issued export download. The constant is the
    // SAME string the route handler stamps into `iam_audit_event.action`,
    // so the resolver and the writer can never silently drift.
    expect(STATUTORY_PACK_EXPORT_AUDIT_ACTION).toBe(
      "erp.hrm.compliance_pack.export"
    )
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[STATUTORY_PACK_EXPORT_AUDIT_ACTION]
    ).toBe("pack_exported")
    // Phase 3U — in-place regeneration. SAME string the producer Server
    // Actions emit, locked here so the action layer + the timeline
    // resolver cannot drift apart.
    expect(STATUTORY_PACK_REGENERATE_AUDIT_ACTION).toBe(
      "erp.hrm.compliance_pack.regenerate"
    )
    expect(
      COMPLIANCE_AUDIT_ACTION_TO_KIND[STATUTORY_PACK_REGENERATE_AUDIT_ACTION]
    ).toBe("regenerated")
  })

  it("collapses every per-bureau submission string to one `submitted_to_bureau` kind", () => {
    // Defensive: as soon as a new pack type is registered with its own
    // `.submitted | .published` string, the mapping table grows in
    // lockstep so the composer cannot silently drop the new bureau's
    // outbound submission events. Annual packs collapse naturally
    // (`borang_e_annual` -> `ea.published`) because the source map
    // already de-duplicates string values.
    for (const action of Object.values(STATUTORY_PACK_TO_EVENT_TYPE)) {
      expect(COMPLIANCE_AUDIT_ACTION_TO_KIND[action]).toBe(
        "submitted_to_bureau"
      )
    }
  })

  it("collapses every per-bureau acknowledgement string to one `acknowledged` kind", () => {
    for (const ackAction of Object.values(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
      expect(COMPLIANCE_AUDIT_ACTION_TO_KIND[ackAction]).toBe("acknowledged")
    }
  })

  it("returns null for actions outside the lifecycle (drop-by-default)", () => {
    expect(complianceTimelineKindForAuditAction("iam.session.start")).toBeNull()
    expect(
      complianceTimelineKindForAuditAction("erp.contact.record.create")
    ).toBeNull()
    expect(complianceTimelineKindForAuditAction("")).toBeNull()
    // Today this has no writer in the codebase. If a writer ever ships,
    // this test must FAIL so the mapping + i18n catalog can be updated
    // together — the same way `erp.hrm.compliance_pack.export` flipped
    // from drop-by-default to `pack_exported` when Phase 3T shipped, and
    // `erp.hrm.compliance_pack.regenerate` flipped to `regenerated`
    // when Phase 3U shipped.
    expect(
      complianceTimelineKindForAuditAction(
        "erp.execution.statutory_submission.delivery.succeeded"
      )
    ).toBeNull()
  })

  it("Phase 3T — resolves the export audit string to `pack_exported`", () => {
    // Positive companion to the drop-by-default assertion above. Locks
    // the resolver in lockstep with the route handler that emits the
    // string. If either side ever drifts (route stops emitting, or the
    // mapping forgets to register the action) this test fails before
    // operators lose visibility into download chain of custody.
    expect(
      complianceTimelineKindForAuditAction(STATUTORY_PACK_EXPORT_AUDIT_ACTION)
    ).toBe("pack_exported")
    expect(
      complianceTimelineKindForAuditAction("erp.hrm.compliance_pack.export")
    ).toBe("pack_exported")
  })

  it("Phase 3U — resolves the regenerate audit string to `regenerated`", () => {
    // Positive companion locking the resolver in lockstep with the
    // producer Server Actions. If the action layer stops emitting (or
    // the mapping forgets to register), this test fails before
    // operators silently lose visibility into prior-version supersedure
    // — including the bureau acknowledgement state that the in-place
    // UPDATE intentionally discarded.
    expect(
      complianceTimelineKindForAuditAction(
        STATUTORY_PACK_REGENERATE_AUDIT_ACTION
      )
    ).toBe("regenerated")
    expect(
      complianceTimelineKindForAuditAction("erp.hrm.compliance_pack.regenerate")
    ).toBe("regenerated")
  })

  it("the SQL filter list and the resolver agree on every action", () => {
    // The composer fetches `inArray(action, COMPLIANCE_TIMELINE_AUDIT_ACTIONS)`
    // and then drops rows where `complianceTimelineKindForAuditAction` is
    // null. If those two sets ever diverge we either fetch rows we cannot
    // render or — worse — fail to fetch rows we then expect.
    expect([...COMPLIANCE_TIMELINE_AUDIT_ACTIONS].sort()).toEqual(
      Object.keys(COMPLIANCE_AUDIT_ACTION_TO_KIND).sort()
    )
    for (const action of COMPLIANCE_TIMELINE_AUDIT_ACTIONS) {
      expect(complianceTimelineKindForAuditAction(action)).not.toBeNull()
    }
  })

  it("filter list contains every pack-type submission and acknowledgement string", () => {
    const filter = new Set(COMPLIANCE_TIMELINE_AUDIT_ACTIONS)
    for (const action of Object.values(STATUTORY_PACK_TO_EVENT_TYPE)) {
      expect(filter.has(action)).toBe(true)
    }
    for (const action of Object.values(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
      expect(filter.has(action)).toBe(true)
    }
  })
})
