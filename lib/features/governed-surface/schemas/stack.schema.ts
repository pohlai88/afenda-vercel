import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_STACK_CONFIGURATION_SCHEMA_ID =
  "governed.stack.configuration" as const

export const GOVERNED_STACK_CONFIGURATION_SCHEMA_STABILITY: SchemaStability =
  "beta"

export const governedStackDirectionSchema = z.enum(["vertical", "horizontal"])

export const governedStackConfigurationSchema = z
  .object({
    direction: governedStackDirectionSchema.default("vertical"),
    chrome: governedSurfaceChromeSchema.optional(),

    /**
     * Kept unknown to avoid circular imports.
     * Final child validation belongs in component.schema.ts.
     */
    children: z.array(z.unknown()).min(1),
  })
  .strict()

export type GovernedStackDirection = z.infer<
  typeof governedStackDirectionSchema
>

export type GovernedStackConfiguration = z.infer<
  typeof governedStackConfigurationSchema
>

export type GovernedStackConfigurationInput = z.input<
  typeof governedStackConfigurationSchema
>

export function parseGovernedStackConfiguration(raw: unknown) {
  return governedStackConfigurationSchema.safeParse(raw)
}
