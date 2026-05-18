import { GOVERNED_METADATA_SCHEMA_VERSION } from "./schemas/schema-version.shared"

/**
 * Normalises stored/cached governed configuration before Zod parse.
 * Add version-specific branches when `GOVERNED_METADATA_SCHEMA_VERSION` increments.
 */
export function migrateGovernedConfiguration<T extends Record<string, unknown>>(
  raw: T
): T & { __schemaVersion: number } {
  const version =
    typeof raw.__schemaVersion === "number" && Number.isFinite(raw.__schemaVersion)
      ? raw.__schemaVersion
      : 1

  if (version === GOVERNED_METADATA_SCHEMA_VERSION) {
    return {
      ...raw,
      __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    }
  }

  // v1 is the only shipped version — future migrations lift older shapes here.
  return {
    ...raw,
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
  }
}
