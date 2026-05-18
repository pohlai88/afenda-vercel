import { describe, expect, it } from "vitest"

import { migrateGovernedConfiguration } from "#features/governed-surface/migrate-governed-configuration.shared"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { GOVERNED_METADATA_SCHEMA_VERSION } from "#features/governed-surface/schemas/schema-version.shared"

describe("governed metadata schema version", () => {
  it("defaults __schemaVersion on list-surface configuration", () => {
    const parsed = parseListSurfaceRendererConfiguration({
      dataNature: "table",
      surface: {
        header: { title: "test" },
        columnsId: "test",
        rowKey: "id",
        empty: { variant: "muted", title: "Empty" },
      },
      columns: [{ id: "id", header: "ID" }],
      rows: [],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.__schemaVersion).toBe(GOVERNED_METADATA_SCHEMA_VERSION)
  })

  it("migrates missing version to current", () => {
    const migrated = migrateGovernedConfiguration({
      dataNature: "table",
    })
    expect(migrated.__schemaVersion).toBe(GOVERNED_METADATA_SCHEMA_VERSION)
  })
})
