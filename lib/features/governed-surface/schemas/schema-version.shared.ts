import { z } from "zod"

/**
 * Current governed metadata configuration version (ADR-0026 P2).
 *
 * Bump when a breaking shape change ships; add a migrator in
 * `migrate-governed-configuration.shared.ts` before raising the max.
 */
export const GOVERNED_METADATA_SCHEMA_VERSION = 1 as const

export const governedMetadataSchemaVersionSchema = z
  .object({
    __schemaVersion: z
      .number()
      .int()
      .positive()
      .max(GOVERNED_METADATA_SCHEMA_VERSION)
      .default(GOVERNED_METADATA_SCHEMA_VERSION),
  })
  .strict()

export type GovernedMetadataSchemaVersion = z.infer<
  typeof governedMetadataSchemaVersionSchema
>
