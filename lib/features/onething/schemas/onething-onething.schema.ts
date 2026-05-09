import { z } from "zod"

import {
  temporalNextSchema,
  temporalNowSchema,
  temporalPastSchema,
} from "#lib/erp/temporal-spine.shared"

import {
  ONETHING_STATES,
  PREDICTION_SEVERITIES,
  type OneThingState,
  type PredictionSeverity,
} from "../constants"

export type { OneThingState, PredictionSeverity }

export const oneThingStateSchema = z.enum(ONETHING_STATES)

export const predictionSchema = z
  .object({
    id: z.string().uuid(),
    generatedBy: z.enum(["lynx", "ranker", "cron"]),
    generatedAt: z.string().trim().min(1).max(64),
    claim: z.string().trim().min(1).max(4000),
    severity: z.enum(PREDICTION_SEVERITIES),
    verifiedAt: z.string().trim().max(64).optional(),
    clearedAt: z.string().trim().max(64).optional(),
    acceptedByUserId: z.string().trim().min(1).max(256).optional(),
  })
  .strict()

export type Prediction = z.infer<typeof predictionSchema>

export const resolutionProofItemSchema = z
  .object({
    type: z.string().trim().min(1).max(64),
    ref: z.string().trim().min(1).max(2000),
    verifiedAt: z.string().trim().max(64).optional(),
  })
  .strict()

export const resolutionProofSchema = z.array(resolutionProofItemSchema).max(50)

export const resolveOrgOneThingFormSchema = z.object({
  oneThingId: z.string().uuid(),
  resolutionNote: z.string().trim().max(8000).optional().default(""),
  resolutionProofJson: z.string().trim().max(100_000).optional().default(""),
})

export const deprecateOrgOneThingFormSchema = z.object({
  oneThingId: z.string().uuid(),
  reason: z.string().trim().min(1).max(8000),
})

export function safeParseTemporalPast(raw: unknown) {
  const p = temporalPastSchema.safeParse(raw)
  return p.success ? p.data : null
}

export function safeParseTemporalNow(raw: unknown) {
  const p = temporalNowSchema.safeParse(raw)
  return p.success ? p.data : null
}

export function safeParseTemporalNext(raw: unknown) {
  const p = temporalNextSchema.safeParse(raw)
  return p.success ? p.data : null
}

export function safeParsePredictions(raw: unknown): Prediction[] {
  if (raw == null || !Array.isArray(raw)) return []
  const out: Prediction[] = []
  for (const item of raw) {
    const p = predictionSchema.safeParse(item)
    if (p.success) out.push(p.data)
  }
  return out
}

export function safeParseResolutionProof(raw: unknown) {
  const p = resolutionProofSchema.safeParse(raw)
  return p.success ? p.data : null
}

/** Severity for DoD gating — derived only from hydrated onething signals (pure). */
export type ResolveSeverity = "low" | "medium" | "high" | "critical"

export function inferResolveSeverityFromSignals(input: {
  impactBlocksGate?: string | null | undefined
  slipCostUsd?: number | null | undefined
  severity: string
  predictions: readonly Prediction[] | null | undefined
}): ResolveSeverity {
  const hasCritical = (input.predictions ?? []).some(
    (p) => p.severity === "critical" && !p.acceptedByUserId && !p.clearedAt
  )
  if (hasCritical) return "critical"
  if (input.impactBlocksGate) return "high"
  if (
    input.slipCostUsd != null &&
    Number.isFinite(input.slipCostUsd) &&
    input.slipCostUsd >= 10_000
  ) {
    return "high"
  }
  if (input.severity === "critical") return "critical"
  if (input.severity === "high") return "high"
  return "low"
}
