import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

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
    delta: z.string().min(1),
    tone: statCardToneSchema,
  })
  .strict()

export const statCardConfigurationSchema = z
  .object({
    stats: z.array(statCardItemSchema).min(1),
  })
  .strict()

export type StatCardTone = z.infer<typeof statCardToneSchema>
export type StatCardItem = z.infer<typeof statCardItemSchema>
export type StatCardConfiguration = z.infer<typeof statCardConfigurationSchema>

export function parseStatCardConfiguration(raw: unknown) {
  return statCardConfigurationSchema.safeParse(raw)
}
