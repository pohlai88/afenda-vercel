import { describe, expect, it, vi, beforeEach } from "vitest"

const {
  requireOrgSessionMock,
  canUseErpPermissionForCurrentOrgMock,
  ensureAppLocaleMock,
  orbitPageMock,
} = vi.hoisted(() => ({
  requireOrgSessionMock: vi.fn(),
  canUseErpPermissionForCurrentOrgMock: vi.fn(),
  ensureAppLocaleMock: vi.fn((locale: string) => locale),
  orbitPageMock: vi.fn(() => null),
}))

vi.mock("server-only", () => ({}))

vi.mock("#lib/auth", () => ({
  requireOrgSession: requireOrgSessionMock,
}))

vi.mock("#features/erp-rbac/server", () => ({
  canUseErpPermissionForCurrentOrg: canUseErpPermissionForCurrentOrgMock,
}))

vi.mock("#lib/i18n/locales.shared", () => ({
  ensureAppLocale: ensureAppLocaleMock,
}))

vi.mock("#features/planner/server", () => ({
  OrbitPage: orbitPageMock,
}))

import OrbitQueuePage from "../../../app/(main)/[locale]/o/[orgSlug]/dashboard/orbit/page"
import OrbitTriagePage from "../../../app/(main)/[locale]/o/[orgSlug]/dashboard/orbit/triage/page"

describe("orbit route wrappers", () => {
  beforeEach(() => {
    requireOrgSessionMock.mockReset()
    canUseErpPermissionForCurrentOrgMock.mockReset()
    ensureAppLocaleMock.mockClear()
    orbitPageMock.mockClear()
  })

  it("passes organization scope and notice authority into the org queue page", async () => {
    requireOrgSessionMock.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      user: { role: "member" },
    })
    canUseErpPermissionForCurrentOrgMock.mockResolvedValue(false)

    const searchParams = { q: "blocked" }
    const element = await OrbitQueuePage({
      params: Promise.resolve({ locale: "en", orgSlug: "acme" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect(ensureAppLocaleMock).toHaveBeenCalledWith("en")
    expect(canUseErpPermissionForCurrentOrgMock).toHaveBeenCalledWith({
      module: "planner",
      object: "notice",
      function: "update",
    })
    expect((element as { props: Record<string, unknown> }).props).toMatchObject(
      {
        scope: {
          scopeKind: "organization",
          organizationId: "org-1",
        },
        orgSlug: "acme",
        surface: "queue",
        searchParams,
        viewerUserId: "user-1",
        canManageNotices: false,
      }
    )
  })

  it("passes organization scope into the org triage page", async () => {
    requireOrgSessionMock.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      user: { role: "admin" },
    })
    canUseErpPermissionForCurrentOrgMock.mockResolvedValue(true)

    const searchParams = { automationState: "attention" }
    const element = await OrbitTriagePage({
      params: Promise.resolve({ locale: "en", orgSlug: "acme" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect((element as { props: Record<string, unknown> }).props).toMatchObject(
      {
        scope: {
          scopeKind: "organization",
          organizationId: "org-1",
        },
        orgSlug: "acme",
        surface: "triage",
        searchParams,
        viewerUserId: "user-1",
        canManageNotices: true,
      }
    )
  })
})
