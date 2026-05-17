import { describe, expect, it } from "vitest"

import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"

import { buildContactsListSurfaceConfiguration } from "#features/contacts/data/contacts-surface-builders.server"

describe("buildContactsListSurfaceConfiguration", () => {
  it("parses as a governed list-surface configuration", () => {
    const configuration = buildContactsListSurfaceConfiguration(
      [
        {
          id: "contact-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          createdAt: new Date("2026-01-15T00:00:00.000Z"),
        },
      ],
      {
        eyebrow: "CRM",
        title: "Directory",
        description: "Contacts",
        empty: "No contacts",
        colName: "Name",
        colEmail: "Email",
        colCreated: "Created",
        noEmail: "—",
      },
      {
        requiresErpPermission: {
          module: "contacts",
          object: "record",
          function: "read",
        },
      }
    )

    const parsed = parseListSurfaceRendererConfiguration(configuration)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data.dataNature).toBe("table")
    expect(parsed.data.presentation?.variant).toBe("table-only")
    expect(parsed.data.presentation?.tableDensity).toBe("compact")
    expect(parsed.data.rows).toHaveLength(1)
    expect(parsed.data.rows[0]?.cells.name).toBe("Ada Lovelace")
    expect(parsed.data.requiresErpPermission?.module).toBe("contacts")
  })
})
