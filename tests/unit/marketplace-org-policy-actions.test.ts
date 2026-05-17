import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireTenantAuthority: vi.fn(),
  requireRecentAuthStepUp: vi.fn(),
  getRequestAppLocale: vi.fn(),
}))

vi.mock("#lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("#lib/auth", () => ({
  requireRecentAuthStepUp: mocks.requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("#features/erp-rbac/server", () => ({
  requireTenantAuthority: mocks.requireTenantAuthority,
}))

vi.mock("#lib/i18n/request-locale.server", () => ({
  getRequestAppLocale: mocks.getRequestAppLocale,
}))

vi.mock("#lib/auth/org-slug.server", () => ({
  getOrganizationSlugById: vi.fn().mockResolvedValue("demo-org"),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}))

import { setOrgCapabilityPolicyAction } from "#features/marketplace/actions/org-policy.actions"
import { db } from "#lib/db"

describe("setOrgCapabilityPolicyAction — step-up callback", () => {
  beforeEach(() => {
    vi.mocked(db.select).mockReset()
    vi.mocked(db.insert).mockReset()
    vi.mocked(db.update).mockReset()
    mocks.requireTenantAuthority.mockReset()
    mocks.requireRecentAuthStepUp.mockReset()
    mocks.getRequestAppLocale.mockReset()
  })

  it("uses a locale-prefixed return path for admin step-up", async () => {
    mocks.requireTenantAuthority.mockResolvedValue({
      ok: true,
      session: {
        userId: "admin-user",
        sessionId: "sess-1",
        organizationId: "org-1",
        user: { email: "admin@example.com", name: null, role: "admin" },
      },
    })
    mocks.getRequestAppLocale.mockResolvedValue("en")

    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    vi.mocked(db.select).mockReturnValue({ from } as never)

    const returning = vi.fn().mockResolvedValue([{ id: "policy-1" }])
    const values = vi.fn().mockReturnValue({ returning })
    vi.mocked(db.insert).mockReturnValue({ values } as never)

    const result = await setOrgCapabilityPolicyAction({
      capabilityId: "right.help",
      state: "mandatory",
      audience: "all",
    })

    expect(result.ok).toBe(true)
    expect(mocks.requireRecentAuthStepUp).toHaveBeenCalledWith({
      returnTo: "/en/o/demo-org/marketplace/admin",
    })
  })

  it("returns permission_denied before step-up when the viewer is not an admin", async () => {
    mocks.requireTenantAuthority.mockResolvedValue({ ok: false })

    const result = await setOrgCapabilityPolicyAction({
      capabilityId: "right.help",
      state: "blocked",
      audience: "all",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("permission_denied")
    }
    expect(mocks.requireRecentAuthStepUp).not.toHaveBeenCalled()
    expect(db.select).not.toHaveBeenCalled()
  })
})
