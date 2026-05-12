/**
 * Phase 3K — Compliance evidence lifecycle timeline.
 *
 * A compliance evidence row has THREE truth sources:
 *   1. Intrinsic timestamps on `hrm_compliance_evidence` itself
 *      (`generatedAt`, `acknowledgedAt`, `createdAt`)
 *   2. Its outbound delivery row on `org_event_delivery`
 *      (`createdAt`, `completedAt`, `attempts`, `state`, `httpStatus`)
 *   3. Its IAM audit chain on `iam_audit_event` filtered by
 *      `resourceType = "hrm.compliance_evidence" AND resourceId = evidenceId`
 *
 * This module owns the **pure types + audit-action -> kind mapping**. The
 * server-side composer ({@link listComplianceEvidenceTimeline}) merges all
 * three sources into a sorted `ComplianceTimelineEntry[]`.
 *
 * No `server-only` import here on purpose — Server Components, Route
 * Handlers, AND tests can all consume the mapping table without pulling the
 * DB graph in. The composer ITSELF is `server-only` because it queries.
 *
 * Doctrine: only ship kinds backed by real writers in this repo today.
 * Future audit splits (delivery_succeeded vs submitted_to_bureau,
 * regenerated, exported, accepted vs acknowledged) add a kind here, an
 * i18n catalog entry, and the writer in the same commit. Keeps the
 * mapping table from rotting into a wishlist.
 */

import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"

import {
  STATUTORY_PACK_TO_ACK_EVENT_TYPE,
  STATUTORY_PACK_TO_EVENT_TYPE,
} from "./statutory-event-types.shared"

/**
 * Discriminated union of every operationally meaningful event in an
 * evidence row's lifecycle. Adding a kind is a public-contract change —
 * update i18n catalogs, golden tests, and the UI label resolver in the
 * same commit.
 */
export const COMPLIANCE_TIMELINE_KINDS = [
  // Intrinsic — derived from `hrm_compliance_evidence` columns directly:
  "generated", // evidence row first written
  // Audit-derived — from `iam_audit_event.action`:
  "submitted_to_bureau", // success path: `erp.hrm.statutory.<bureau>.{submitted|published}`
  "delivery_failed", // outbound HTTP delivery returned non-2xx
  "retry_attempted", // auto-retry tick re-sent a failed delivery
  "retry_exhausted", // auto-retry tick gave up after max attempts
  // Phase 3M / 3O — system-observed aging crossings. Emitted by the
  // aging watch cron (NOT by HR or by the bureau) when a `submitted`
  // row crosses each operational severity threshold. Each tier is
  // idempotent per evidence row, but the three tiers are independent
  // — a row that is 35 days stuck on its first observation gets all
  // three audits in the SAME tick. Multiple rows here is the feature.
  "aging_detected", // crossed STUCK_DAYS (default 7)
  "aging_escalated", // crossed ESCALATED_DAYS (default 14)
  "aging_critical", // crossed CRITICAL_DAYS (default 30)
  "acknowledged", // bureau confirmed receipt (manual OR webhook)
  // Phase 3T — operator-issued export download (JSON or CSV) emitted by
  // the `app/api/integrations/hrm-statutory-pack-export` route handler
  // after a successful re-derivation. Surfacing this kind closes the
  // tamper-evidence loop: the same `responseHash` that anchors
  // `X-Afenda-Pack-Hash` on the wire is now visible on the per-evidence
  // chronology, so HR can answer "which file does finance have?" against
  // a public chain of custody. NOT idempotent — every download writes a
  // new row by design (each download is its own evidentiary event).
  "pack_exported",
  // Phase 3U — operator-driven re-generation that overwrote a *different*
  // `inputHash`. Emitted by the producer Server Actions after the upsert
  // mutation reports a non-null `prior` snapshot. Carries the
  // provenance + lifecycle state the UPDATE just discarded — most
  // importantly any bureau acknowledgement that the regenerated pack
  // does NOT inherit. Idempotent UPDATEs (same inputHash) and INSERTs do
  // NOT emit this kind — only real overwrites.
  "regenerated",
] as const

/**
 * Phase 3T — Canonical IAM audit action for statutory pack downloads.
 *
 * Single source of truth for both the writer (route handler under
 * `app/api/integrations/hrm-statutory-pack-export/[evidenceId]`) and the
 * reader (timeline mapping below). Hoisting it here means the constant,
 * the timeline kind, and the i18n catalog entry move together — no
 * silent drift between the audit string the route stamps and the string
 * the timeline composer fetches via `inArray(action, ...)`.
 *
 * Bumping this value is a public-contract change — coordinate with
 * regulator dashboards, log drains, and `AGENTS.md` in the same commit.
 */
export const STATUTORY_PACK_EXPORT_AUDIT_ACTION =
  "erp.hrm.compliance_pack.export"

/**
 * Phase 3U — Canonical IAM audit action for in-place regenerations.
 *
 * Emitted by the producer Server Actions when
 * `upsertComplianceEvidenceMutation` reports a non-null `prior`
 * snapshot — i.e. an existing row was overwritten with a *different*
 * `inputHash`. Idempotent identical-hash re-submits and INSERTs do NOT
 * emit this string.
 *
 * Same drift-prevention contract as the export action above: writer +
 * reader + i18n catalog move together; bumping is a public-contract
 * change.
 */
export const STATUTORY_PACK_REGENERATE_AUDIT_ACTION =
  "erp.hrm.compliance_pack.regenerate"

export type ComplianceTimelineKind = (typeof COMPLIANCE_TIMELINE_KINDS)[number]

const COMPLIANCE_TIMELINE_KIND_SET: ReadonlySet<string> = new Set(
  COMPLIANCE_TIMELINE_KINDS
)

export function isComplianceTimelineKind(
  value: string | null | undefined
): value is ComplianceTimelineKind {
  return typeof value === "string" && COMPLIANCE_TIMELINE_KIND_SET.has(value)
}

/**
 * One row of the composed timeline. Sorted by `occurredAt` ascending in the
 * default composer; UI may flip to descending for "most recent first" reads.
 */
export type ComplianceTimelineEntry = {
  kind: ComplianceTimelineKind
  /** Stable id for React keys. Audit-derived rows use the `iam_audit_event.id`; intrinsic rows synthesize a deterministic id. */
  id: string
  occurredAt: Date
  /** User id when known; null for system / webhook actors. */
  actorUserId: string | null
  /** Email when joinable through `neon_auth.user`; falls back to actor id when not. */
  actorEmail: string | null
  /** Optional structured metadata copied verbatim from the underlying source. */
  metadata: Record<string, unknown> | null
}

/**
 * Build the audit-action -> timeline kind map from the SAME tables that
 * power the writer side. Forces the resolver to grow whenever a new
 * statutory pack is registered with its own submitted / acknowledged
 * audit string.
 */
function buildAuditActionToKindMap(): Record<string, ComplianceTimelineKind> {
  const map: Record<string, ComplianceTimelineKind> = {
    // Outbound delivery failure (Phase 3F) — the success path emits
    // per-bureau `.submitted | .published` strings instead, NOT
    // `erp.execution.*.delivery.succeeded`.
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_DELIVERY_FAILED]:
      "delivery_failed",

    // Auto-retry lifecycle (Phase 3G):
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_ATTEMPTED]:
      "retry_attempted",
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_RETRY_EXHAUSTED]:
      "retry_exhausted",

    // Phase 3M / 3O — system-observed aging crossings (one mapping per
    // severity tier; the writer side guarantees independent
    // per-tier-per-row idempotency).
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_DETECTED]:
      "aging_detected",
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_ESCALATED]:
      "aging_escalated",
    [EXECUTION_AUDIT_ACTIONS.STATUTORY_SUBMISSION_AGING_CRITICAL]:
      "aging_critical",

    // Phase 3T — operator-issued export download. Maps the canonical
    // route-handler audit string to the `pack_exported` kind. Multiple
    // downloads per evidence row are intentional — each is a distinct
    // chain-of-custody event with its own `responseHash`.
    [STATUTORY_PACK_EXPORT_AUDIT_ACTION]: "pack_exported",

    // Phase 3U — in-place regeneration that overwrote a different
    // `inputHash`. Emitted by the producer Server Actions, NOT by the
    // mutation directly, so the action layer owns Server-Action audit
    // discipline (idempotent re-submits do not produce a row).
    [STATUTORY_PACK_REGENERATE_AUDIT_ACTION]: "regenerated",
  }

  // Per-bureau outbound submission success — every action in
  // STATUTORY_PACK_TO_EVENT_TYPE collapses to `submitted_to_bureau`.
  // Annual packs (`borang_e_annual` -> `ea.published`) are de-duplicated
  // by the object literal naturally.
  for (const action of Object.values(STATUTORY_PACK_TO_EVENT_TYPE)) {
    map[action] = "submitted_to_bureau"
  }

  // Per-bureau acknowledgement (Phase 3H/3I/3J — manual + webhook collapse
  // to one kind):
  for (const action of Object.values(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
    map[action] = "acknowledged"
  }

  return map
}

/**
 * Audit-action -> timeline kind map.
 *
 * Doctrine:
 *   - The KEYS are the public, machine-readable audit strings already
 *     stamped into `iam_audit_event.action` by Server Actions / cron / webhook.
 *     Bumping a key is a breaking change — coordinate with audit grep
 *     extractors and downstream dashboards.
 *   - Acknowledgement actions live under `erp.hrm.statutory.<bureau>.acknowledged`
 *     and are folded into a SINGLE timeline kind (`acknowledged`); UI
 *     resolves the bureau label separately so we do not multiply kinds by
 *     pack count.
 *   - Submission success actions live under `erp.hrm.statutory.<bureau>.{submitted|published}`
 *     and are folded into `submitted_to_bureau` for the same reason.
 *   - Failure / retry execution actions live under
 *     `erp.execution.statutory_submission.*` — see
 *     `lib/features/execution/execution.contract.ts` for the canonical list.
 */
export const COMPLIANCE_AUDIT_ACTION_TO_KIND: Readonly<
  Record<string, ComplianceTimelineKind>
> = buildAuditActionToKindMap()

/**
 * Resolves an `iam_audit_event.action` string to its timeline kind. Returns
 * `null` for actions that should NOT appear in the lifecycle timeline (e.g.
 * unrelated `iam.session.*` rows accidentally joined). Caller drops nulls.
 */
export function complianceTimelineKindForAuditAction(
  action: string
): ComplianceTimelineKind | null {
  return COMPLIANCE_AUDIT_ACTION_TO_KIND[action] ?? null
}

/**
 * The canonical set of audit action strings the composer needs to fetch.
 * Exposed so the SQL `inArray(...)` filter stays in lockstep with the
 * mapping table — no risk of fetching rows we then drop, no risk of
 * missing rows we mapped.
 */
export const COMPLIANCE_TIMELINE_AUDIT_ACTIONS: readonly string[] = Object.keys(
  COMPLIANCE_AUDIT_ACTION_TO_KIND
)
