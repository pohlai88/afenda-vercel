import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { pageHeaderSchema } from "./page-header.schema"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_SECTION_CONFIGURATION_SCHEMA_ID =
  "governed.section.configuration" as const

export const GOVERNED_SECTION_CONFIGURATION_SCHEMA_STABILITY: SchemaStability =
  "beta"

/**
 * Section container configuration.
 *
 * Children are intentionally kept as unknown here to avoid circular imports.
 * `component.schema.ts` owns final child component validation.
 */
export const governedSectionConfigurationSchema = z
  .object({
    header: pageHeaderSchema.optional(),
    chrome: governedSurfaceChromeSchema.optional(),
    children: z.array(z.unknown()).min(1),
  })
  .strict()

export type GovernedSectionConfiguration = z.infer<
  typeof governedSectionConfigurationSchema
>

export type GovernedSectionConfigurationInput = z.input<
  typeof governedSectionConfigurationSchema
>

export function parseGovernedSectionConfiguration(raw: unknown) {
  return governedSectionConfigurationSchema.safeParse(raw)
}
