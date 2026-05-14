import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "experimental"

/**
 * Maps governed `Component.type` strings to approved renderer ids — expand as
 * renderers register; starts empty so adoption is incremental.
 */
export const governedComponentRegistrySchema = z.record(
  z.string().min(1),
  z.string().min(1)
)

export type GovernedComponentRegistry = z.infer<
  typeof governedComponentRegistrySchema
>

export function parseGovernedComponentRegistryData(raw: unknown) {
  return governedComponentRegistrySchema.safeParse(raw)
}

export const EMPTY_GOVERNED_COMPONENT_REGISTRY: GovernedComponentRegistry =
  Object.freeze({})
