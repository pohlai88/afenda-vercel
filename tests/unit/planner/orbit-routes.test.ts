import { describe, expect, it, vi, beforeEach } from "vitest"

const {
  requireOrgSessionMock,
  requireSignedInSessionMock,
  canActInOrganizationMock,
  ensureAppLocaleMock,
  orbitPageMock,
} = vi.hoisted(() => ({
  requireOrgSessionMock: vi.fn(),
  requireSignedInSessionMock: vi.fn(),
  canActInOrganizationMock: vi.fn(),
  ensureAppLocaleMock: vi.fn((locale: string) => locale),
  orbitPageMock: vi.fn(() => null),
}))

vi.mock("#lib/tenant", () => ({
  requireOrgSession: requireOrgSessionMock,
  requireSignedInSession: requireSignedInSessionMock,
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

import AccountOrbitQueuePage from "../../../app/[locale]/(iam)/account/orbit/page"
import AccountOrbitTriagePage from "../../../app/[locale]/(iam)/account/orbit/triage/page"
import OrbitQueuePage from "../../../app/[locale]/o/[orgSlug]/dashboard/orbit/page"
import OrbitTriagePage from "../../../app/[locale]/o/[orgSlug]/dashboard/orbit/triage/page"

describe("orbit route wrappers", () => {
  beforeEach(() => {
    requireOrgSessionMock.mockReset()
    requireSignedInSessionMock.mockReset()
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

  it("passes personal scope into the account queue page", async () => {
    requireSignedInSessionMock.mockResolvedValue({
      userId: "user-9",
    })

    const searchParams = { view: "ops" }
    const element = await AccountOrbitQueuePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect(ensureAppLocaleMock).toHaveBeenCalledWith("en")
    expect((element as { props: Record<string, unknown> }).props).toMatchObject(
      {
        scope: {
          scopeKind: "personal",
          ownerUserId: "user-9",
        },
        surface: "queue",
        searchParams,
        viewerUserId: "user-9",
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

  it("passes personal scope into the account triage page", async () => {
    requireSignedInSessionMock.mockResolvedValue({
      userId: "user-9",
    })

    const element = await AccountOrbitTriagePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    } as never)

    expect((element as { props: Record<string, unknown> }).props).toMatchObject(
      {
        scope: {
          scopeKind: "personal",
          ownerUserId: "user-9",
        },
        surface: "triage",
        viewerUserId: "user-9",
      }
    )
  })
})
