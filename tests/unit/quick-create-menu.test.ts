import { describe, expect, it, vi } from "vitest"

import { buildQuickCreateMenu } from "#features/nexus/data/quick-create-menu.server"

vi.mock("#features/erp-rbac/server", () => ({
  listEffectiveErpPermissionsForUser: vi.fn(),
}))

import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"

describe("buildQuickCreateMenu", () => {
  it("includes contact create when ERP permission is granted", async () => {
    vi.mocked(listEffectiveErpPermissionsForUser).mockResolvedValue([
      "contacts.record.create",
    ])

    const menu = await buildQuickCreateMenu({
      orgSlug: "acme",
      orgId: "org-1",
      userId: "user-1",
    })

    expect(
      menu.entries.some(
        (entry) => entry.kind === "contact" && entry.id === "contact-create"
      )
    ).toBe(true)
  })

  it("omits contact create when permission is missing", async () => {
    vi.mocked(listEffectiveErpPermissionsForUser).mockResolvedValue([])

    const menu = await buildQuickCreateMenu({
      orgSlug: "acme",
      orgId: "org-1",
      userId: "user-1",
    })

    expect(menu.entries.some((entry) => entry.kind === "contact")).toBe(false)
    expect(menu.entries.some((entry) => entry.kind === "orbit-signal")).toBe(
      true
    )
  })
})
