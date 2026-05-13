import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Serializable page chrome — copy is resolved upstream (e.g. `getTranslations`)
 * before validation; this schema is the governance kernel for headers.
 *
 * RESERVED (promote when a consumer needs them — see ADR-0011):
 * - `surfacePurpose`: directory | workspace | review | audit | execution
 * - `operationalState`: active | blocked | review | archived | maintenance
 */
export const pageHeaderSchema = z
  .object({
    eyebrow: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    /** Locale-internal path (e.g. from path builders) — pair with `backLabel`. */
    backHref: z.string().min(1).optional(),
    /** Catalog-resolved label; set when `backHref` is present for header back chrome. */
    backLabel: z.string().min(1).optional(),
  })
  .strict()

export type PageHeader = z.infer<typeof pageHeaderSchema>

export function parsePageHeaderData(raw: unknown) {
  return pageHeaderSchema.safeParse(raw)
}
