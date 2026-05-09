import type { AuditEvent7W1H } from "#lib/erp/audit-7w1h.shared"
import type {
  TemporalNext,
  TemporalNow,
  TemporalPast,
} from "#lib/erp/temporal-spine.shared"

import type { Prediction } from "./schemas/onething-onething.schema"

export type CreateOrgOneThingFormState =
  | undefined
  | {
      ok: true
    }
  | {
      ok: false
      errors: {
        title?: string
        form?: string
      }
    }

/** Client-safe DoD checklist shape returned when resolve fails `dod_failed`. */
export type ResolveOneThingDoDChecks = {
  consequenceClosed: boolean
  ownerDecisionRecorded: boolean
  evidenceAttached: boolean
  predictionsHandled: boolean
}

/** Mirrors `resolveOrgOneThing` / `resolvePersonalOneThing` return shape for UI. */
export type ResolveOneThingActionResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition" | "dod_failed"
      checks?: ResolveOneThingDoDChecks
    }

/** Mirrors `deprecateOrgOneThing` / `deprecatePersonalOneThing` return shape for UI. */
export type DeprecateOneThingActionResult =
  | { ok: true }
  | {
      ok: false
      code: "invalid_input" | "not_found" | "bad_transition"
    }

/**
 * Operational atom — the four optional spokes that turn a string-with-checkbox
 * into a unit of work that already knows what it links to, who it owes, where
 * it came from, and what it unblocks. All four are stored as JSONB on the
 * `onething` row and are intentionally sparse.
 */

/** A single cross-module reference. Free-form by design — the chip renders it. */
export type OneThingLinkageEntityRef = {
  /** Short uppercase module tag like `PO`, `SO`, `CT`, `RUN`. Drives the chip tag. */
  module: string
  /** Stable id within that module (PO id, contact id, run id, etc.). */
  id: string
  /** Human-readable label (chip's display text). */
  label?: string
  /** Optional secondary metric (price, quantity, slug). Renders muted on the chip. */
  meta?: string
}

/** Linkage spoke — which run / entities / module own this atom. */
export type OneThingLinkage = {
  /** Active operational run id (e.g. `q1-vendor-onboarding/0488`). */
  runId?: string
  /** Cross-module entity refs displayed as chips on the canvas. */
  entities?: OneThingLinkageEntityRef[]
  /** Owning module tag — short uppercase. Used for grouping / filtering. */
  owningModule?: string
}

/** Counter-party spoke — who currently blocks whom. Multi-party first-class. */
export type OneThingCounterparty = {
  /**
   * Direction of the obligation. `system` = owed to a process (cron, SLA);
   * `shared` = both parties contribute concurrently (e.g. reconciliation).
   */
  direction: "you-owe" | "owes-you" | "system" | "shared"
  /** Counter-party Neon Auth user id when intra-org. */
  userId?: string
  /** Display name when `userId` is unknown or party is external. */
  displayName?: string
  /** Role / title (rendered muted). */
  role?: string
  /** True for cross-org parties — gets an `external` chip on the canvas. */
  external?: boolean
}

/** Provenance spoke — where the atom came from. */
export type OneThingProvenance = {
  kind: "person" | "lynx" | "cron" | "approval" | "import" | "system"
  /** Source path (e.g. `lynx.truth`, `cron.daily-digest`, `approval.po`). */
  source?: string
  /** Confidence (0..1) when system/lynx-generated. */
  confidence?: number
  /** Human-readable note (e.g. `cluster 0.78`, `vendor onboarding digest`). */
  note?: string
}

/** Impact spoke — what completing (or slipping) this changes downstream. */
export type OneThingImpact = {
  /** Number of downstream onething this completion would unblock. */
  unblocks?: number
  /** Approximate cost of slip in USD (number, not string, for ranking). */
  slipCostUsd?: number
  /**
   * Time horizon (ms from `now`) before this becomes blocking. Negative = already
   * blocking. Stored as ms so the ranker can be deterministic against any clock.
   */
  slaHorizonMs?: number
  /** Downstream gate that this atom blocks (e.g. `period-close`, `posting`). */
  blocksGate?: string
}

export type OneThingRow = {
  id: string
  listId: string
  title: string
  consequence: string
  state: string
  severity: string
  dueAt: Date | null
  snoozeUntil: Date | null
  assigneeUserId: string | null
  recurrenceRule: string | null
  position: number
  createdAt: Date
  updatedAt: Date
  /** Operational atom — optional, hydrated from JSONB columns. */
  linkage: OneThingLinkage | null
  counterparty: OneThingCounterparty | null
  provenance: OneThingProvenance | null
  impact: OneThingImpact | null
  temporalPast: TemporalPast | null
  temporalNow: TemporalNow | null
  temporalNext: TemporalNext | null
  resolvedAt: Date | null
  deprecatedAt: Date | null
  resolutionNote: string | null
  resolutionProof: Array<{
    type: string
    ref: string
    verifiedAt?: string
  }> | null
  predictions: Prediction[] | null
  audit7w1h: AuditEvent7W1H[] | null
}

export type OneThingListRow = {
  id: string
  name: string
  slug: string
  archivedAt: Date | null
}
