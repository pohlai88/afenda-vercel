import "server-only"

import type { OneThingState } from "../constants"
import {
  inferResolveSeverityFromSignals,
  safeParsePredictions,
  type ResolveSeverity,
} from "../schemas/onething-onething.schema"
import type { OneThingRow } from "../types"

const VALID_TRANSITIONS: Readonly<
  Record<OneThingState | "__null__", readonly OneThingState[]>
> = {
  __null__: ["owned", "detected", "resolving", "blocked"],
  detected: ["owned", "resolving", "blocked", "resolved", "deprecated"],
  owned: ["resolving", "ready_to_release", "blocked", "deprecated"],
  blocked: ["resolving", "ready_to_release", "deprecated"],
  resolving: ["ready_to_release", "resolved", "deprecated", "blocked"],
  ready_to_release: ["released", "resolved", "deprecated", "blocked"],
  released: ["resolved", "deprecated"],
  resolved: [],
  deprecated: [],
}

export function mapLegacyOneThingStateToOneThingState(
  legacyState: string,
  assigneeUserId: string | null
): OneThingState | null {
  switch (legacyState) {
    case "pending":
      return assigneeUserId ? "owned" : "detected"
    case "in_progress":
      return "resolving"
    case "completed":
      return "resolved"
    case "cancelled":
      return "deprecated"
    case "snoozed":
      return "blocked"
    default:
      return null
  }
}

export function canTransitionOneThingState(
  from: OneThingState | null | undefined,
  to: OneThingState
): boolean {
  const key = from ?? "__null__"
  const allowed = VALID_TRANSITIONS[key as keyof typeof VALID_TRANSITIONS]
  return allowed?.includes(to) ?? false
}

export type ResolveDoDChecks = {
  consequenceClosed: boolean
  ownerDecisionRecorded: boolean
  evidenceAttached: boolean
  predictionsHandled: boolean
}

export function evaluateResolveDoD(
  severity: ResolveSeverity,
  input: {
    resolutionNote: string
    resolutionProofCount: number
    predictions: readonly {
      clearedAt?: string
      acceptedByUserId?: string
      severity?: string
    }[]
    /** When true, non-empty predictions are cleared by the same resolve mutation. */
    willClearPredictionsOnResolve?: boolean
  }
): { ok: true } | { ok: false; checks: ResolveDoDChecks } {
  const trimmedNote = input.resolutionNote.trim()
  const preds = input.predictions ?? []
  const predictionsHandled =
    preds.length === 0 ||
    Boolean(input.willClearPredictionsOnResolve) ||
    preds.every((p) => Boolean(p.clearedAt) || Boolean(p.acceptedByUserId))
  const criticalUnaccepted = preds.some(
    (p) => p.severity === "critical" && !p.acceptedByUserId && !p.clearedAt
  )

  const checks: ResolveDoDChecks = {
    consequenceClosed: true,
    ownerDecisionRecorded: severity === "low" ? true : trimmedNote.length > 0,
    evidenceAttached:
      severity === "high" || severity === "critical"
        ? input.resolutionProofCount > 0
        : true,
    predictionsHandled,
  }

  const evidenceCoversCriticalRisk =
    !criticalUnaccepted || input.resolutionProofCount > 0

  const ok =
    checks.ownerDecisionRecorded &&
    checks.evidenceAttached &&
    checks.predictionsHandled &&
    evidenceCoversCriticalRisk

  return ok ? { ok: true } : { ok: false, checks }
}

export function resolveSeverityForOneThingRow(
  row: OneThingRow
): ResolveSeverity {
  return inferResolveSeverityFromSignals({
    impactBlocksGate: row.impact?.blocksGate,
    slipCostUsd: row.impact?.slipCostUsd,
    severity: row.severity,
    predictions: safeParsePredictions(row.predictions),
  })
}
