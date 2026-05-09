import "server-only"

import { randomUUID } from "node:crypto"

import type { OneThingRow } from "../types"
import type { Prediction } from "../schemas/onething-onething.schema"

/**
 * Deterministic ranker / cron-style predictions from impact signals only (no LLM).
 */
export function derivePredictionsFromImpact(row: OneThingRow): Prediction[] {
  const out: Prediction[] = []
  const nowIso = new Date().toISOString()

  if (row.impact?.blocksGate) {
    out.push({
      id: randomUUID(),
      generatedBy: "ranker",
      generatedAt: nowIso,
      claim: `If ignored, downstream gate "${row.impact.blocksGate}" may stay blocked.`,
      severity: "high",
    })
  }

  const slip = row.impact?.slipCostUsd
  if (slip != null && Number.isFinite(slip) && slip >= 1000) {
    out.push({
      id: randomUUID(),
      generatedBy: "ranker",
      generatedAt: nowIso,
      claim: `If ignored, estimated slip exposure is significant (~$${Math.round(slip)}).`,
      severity: slip >= 50_000 ? "critical" : "medium",
    })
  }

  return out
}

/** Stamp `clearedAt` for every prediction when the consequence is resolved. */
export function markPredictionsClearedForResolve(
  preds: readonly Prediction[] | null | undefined
): Prediction[] {
  const list = preds ?? []
  const t = new Date().toISOString()
  return list.map((p) => ({
    ...p,
    clearedAt: p.clearedAt ?? t,
  }))
}
