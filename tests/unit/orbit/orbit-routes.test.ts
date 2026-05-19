import { describe, expect, it, vi, beforeEach } from "vitest"

const {
  getOrgTenantContextMock,
  canUseErpPermissionForCurrentOrgMock,
  ensureAppLocaleMock,
  orbitAppsRoutePageMock,
} = vi.hoisted(() => ({
  getOrgTenantContextMock: vi.fn(),
  canUseErpPermissionForCurrentOrgMock: vi.fn(),
  ensureAppLocaleMock: vi.fn((locale: string) => locale),
  orbitAppsRoutePageMock: vi.fn(() => null),
}))

vi.mock("server-only", () => ({}))

vi.mock("#lib/auth", () => ({
  getOrgTenantContext: getOrgTenantContextMock,
}))

vi.mock("#features/erp-rbac/server", () => ({
  canUseErpPermissionForCurrentOrg: canUseErpPermissionForCurrentOrgMock,
}))

vi.mock("#lib/i18n/locales.shared", () => ({
  ensureAppLocale: ensureAppLocaleMock,
}))

vi.mock("#features/orbit/server", () => ({
  OrbitAppsRoutePage: orbitAppsRoutePageMock,
}))

import OrbitQueuePage from "../../../app/(main)/[locale]/o/[orgSlug]/apps/orbit/page"
import OrbitTriagePage from "../../../app/(main)/[locale]/o/[orgSlug]/apps/orbit/triage/page"

describe("orbit route wrappers", () => {
  beforeEach(() => {
    getOrgTenantContextMock.mockReset()
    canUseErpPermissionForCurrentOrgMock.mockReset()
    ensureAppLocaleMock.mockClear()
    orbitAppsRoutePageMock.mockClear()
  })

  it("passes locale, org slug, surface, and notice authority into the org queue page", async () => {
    getOrgTenantContextMock.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
    })
    canUseErpPermissionForCurrentOrgMock.mockResolvedValue(false)

    const searchParams = { q: "blocked" }
    const element = await OrbitQueuePage({
      params: Promise.resolve({ locale: "en", orgSlug: "acme" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect(
      (element as { props: Record<string, unknown> }).props
    ).toMatchObject({
      localeRaw: "en",
      orgSlug: "acme",
      surface: "queue",
      searchParams,
    })
  })

  it("passes locale and org slug into the org triage page", async () => {
    getOrgTenantContextMock.mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
    })
    canUseErpPermissionForCurrentOrgMock.mockResolvedValue(true)

    const searchParams = { automationState: "attention" }
    const element = await OrbitTriagePage({
      params: Promise.resolve({ locale: "en", orgSlug: "acme" }),
      searchParams: Promise.resolve(searchParams),
    } as never)

    expect(
      (element as { props: Record<string, unknown> }).props
    ).toMatchObject({
      localeRaw: "en",
      orgSlug: "acme",
      surface: "triage",
      searchParams,
    })
  })
})
