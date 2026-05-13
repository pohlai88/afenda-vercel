import { describe, expect, it, vi, beforeEach } from "vitest"

const {
  requireOrgSessionMock,
  canActInOrganizationMock,
  ensureAppLocaleMock,
  orbitPageMock,
} = vi.hoisted(() => ({
  requireOrgSessionMock: vi.fn(),
  canActInOrganizationMock: vi.fn(),
  ensureAppLocaleMock: vi.fn((locale: string) => locale),
  orbitPageMock: vi.fn(() => null),
}))

vi.mock("#lib/tenant", () => ({
  requireOrgSession: requireOrgSessionMock,
}))

vi.mock("#lib/auth", () => ({
  canActInOrganization: canActInOrganizationMock,
}))

vi.mock("#lib/i18n/locales.shared", () => ({
  ensureAppLocale: ensureAppLocaleMock,
}))

vi.mock("#features/planner/server", () => ({
  OrbitPage: orbitPageMock,
}))

import OrbitQueuePage from "../../../app/[locale]/o/[orgSlug]/dashboard/orbit/page"
import OrbitTriagePage from "../../../app/[locale]/o/[orgSlug]/dashboard/orbit/triage/page"

describe("orbit route wrappers", () => {
  beforeEach(() => {
    requireOrgSessionMock.mockReset()
    canActInOrganizationMock.mockReset()
    ensureAppLocaleMock.mockClear()
    orbitPageMock.mockClear()
  })

  it("passes organization scope and notice authority into the org queue page", async () => {
    requireOrgSessionMock.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      user: { role: "member" },
    })
    canActInOrganizationMock.mockResolvedValue(false)

    const searchParams = { q: "blocked" }
    const element = await OrbitQueuePage({
      params: Promise.resolve({ locale: "en", orgSlug: "acme" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect(ensureAppLocaleMock).toHaveBeenCalledWith("en")
    expect(canActInOrganizationMock).toHaveBeenCalledWith(
      "user-1",
      "member",
      "org-1",
      "admin"
    )
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
    canActInOrganizationMock.mockResolvedValue(true)

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
