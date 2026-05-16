import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Separates renderer choice (`type`) from semantic intent (`serverType`) — see
 * ADR-0011 / metadata UI readiness plan (UIMF `Component` analog).
 */
export const governedComponentSchema = z
  .object({
    type: z.string().min(1),
    serverType: z.string().min(1),
    configuration: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type GovernedComponent = z.infer<typeof governedComponentSchema>

export function parseGovernedComponentData(raw: unknown) {
  return governedComponentSchema.safeParse(raw)
}
