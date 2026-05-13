import { describe, expect, it } from "vitest"

import {
  loadOrgAdminAuditSearchParams,
  serializeOrgAdminAuditSearchParams,
} from "#features/org-admin/schemas/org-admin-audit.search-params"

describe("org-admin audit nuqs search params", () => {
  it("loads defaults", async () => {
    const loaded = await loadOrgAdminAuditSearchParams({})
    expect(loaded.page).toBe(1)
    expect(loaded.view).toBeNull()
  })

  it("round-trips view + page via serializer", () => {
    const href = serializeOrgAdminAuditSearchParams("/en/o/acme/admin/audit", {
      page: 2,
      view: "simulated",
    })
    expect(href).toContain("page=2")
    expect(href).toContain("view=simulated")
  })
})
