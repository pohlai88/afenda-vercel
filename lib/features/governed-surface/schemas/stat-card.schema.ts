import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { refineStatCardDisplayStrings } from "./display-string.shared"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const SCHEMA_STABILITY: SchemaStability = "beta"

export const statCardToneSchema = z.enum([
  "positive",
  "attention",
  "default",
  "critical",
])

export const statCardItemSchema = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
    delta: z.string().min(1).optional(),
    tone: statCardToneSchema.default("default"),
  })
  .strict()

/**
 * Stat-card data nature (ADR-0025 §2).
 *
 * `kpi`              — at-a-glance comparative KPIs (≤ 4 tiles).
 * `snapshot-summary` — 5–6 figure read-only operational summary
 *                       (e.g. payslip totals, payroll period header).
 *
 * Renderers in `components2/metadata/renderers/` may only accept the natures
 * declared in `AFENDA_GOVERNED_RENDERER_CONTRACTS["stat-card"].acceptedNatures`.
 */
export const statCardDataNatureSchema = z.enum(["kpi", "snapshot-summary"])
export type StatCardDataNature = z.infer<typeof statCardDataNatureSchema>

/**
 * Tile density (ADR-0025 §1).
 *
 * `comfortable` — default. 1 → 2 → 4 column grid driven by container width.
 * `compact`     — 1 → 2 column grid for narrow rails (≤ ~500 px) or ≤ 2 tiles.
 */
export const statCardDensitySchema = z.enum(["compact", "comfortable"])
export type StatCardDensity = z.infer<typeof statCardDensitySchema>

export const statCardConfigurationSchema = z
  .object({
    dataNature: statCardDataNatureSchema.default("kpi"),
    density: statCardDensitySchema.default("comfortable"),
    stats: z.array(statCardItemSchema).min(1).max(6),
    chrome: governedSurfaceChromeSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (config.dataNature === "kpi" && config.stats.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stats"],
        message:
          'KPI stat-card supports at most 4 tiles. Use dataNature: "snapshot-summary" for 5–6 figures or split into multiple stat-cards.',
      })
    }
    refineStatCardDisplayStrings(config, ctx)
  })

export type StatCardTone = z.infer<typeof statCardToneSchema>
export type StatCardItem = z.infer<typeof statCardItemSchema>
export type StatCardConfiguration = z.infer<typeof statCardConfigurationSchema>
export type StatCardConfigurationInput = z.input<
  typeof statCardConfigurationSchema
>

export function parseStatCardConfiguration(raw: unknown) {
  return statCardConfigurationSchema.safeParse(raw)
}
