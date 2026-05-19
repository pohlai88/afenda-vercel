import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}))

import sitemap from "../../app/sitemap"
import { GET as securityTxtGET } from "../../app/.well-known/security.txt/route"
import {
  buildLegalDocsStaticParams,
  declarationRouteReviewedAtByHref,
  fallbackOpenStatusSnapshot,
  latestLegalDeclarationReviewedAt,
  publicTrustIndexableRoutes,
  publicTrustOwnerRoutes,
  resolveLegalDocsSlug,
  securityDisclosureLink,
  securityTxtExpiresAt,
  securityTxtHref,
  trustSurfaceDefinition,
  trustSurfaceDefinitionBaseline,
  trustSurfaceDefinitionResolved,
} from "#features/legal-docs"
import { generateLegalDocsMetadata } from "#features/legal-docs/server"
import {
  DEFAULT_APP_LOCALE,
  APP_LOCALES,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

describe("public trust routing", () => {
  it("resolves legal-docs catch-all slugs from the indexable route registry", () => {
    expect(resolveLegalDocsSlug(["cookies"])).toBe("cookies")
    expect(resolveLegalDocsSlug(["security", "disclosure"])).toBe(
      "security/disclosure"
    )
    expect(resolveLegalDocsSlug(["trust"])).toBe("trust")
    expect(resolveLegalDocsSlug(["status"])).toBe("status")
    expect(resolveLegalDocsSlug(["unknown"])).toBeNull()
    expect(resolveLegalDocsSlug([])).toBeNull()
  })

  it("builds static params for every indexable trust/legal route", () => {
    const params = buildLegalDocsStaticParams()
    const slugKeys = params.map(({ slug }) => slug.join("/"))

    for (const route of publicTrustIndexableRoutes) {
      const tail = route.replace("/legal-docs/", "")
      expect(slugKeys).toContain(tail)
    }

    expect(params.length).toBe(
      publicTrustIndexableRoutes.length * APP_LOCALES.length
    )
  })

  it("returns metadata titles for trust and status routes", async () => {
    const trustMeta = await generateLegalDocsMetadata({
      params: Promise.resolve({ locale: DEFAULT_APP_LOCALE, slug: ["trust"] }),
    })
    const statusMeta = await generateLegalDocsMetadata({
      params: Promise.resolve({ locale: DEFAULT_APP_LOCALE, slug: ["status"] }),
    })

    expect(trustMeta.title).toBe("Trust")
    expect(statusMeta.title).toMatch(/Status/)
  })

  it("renders trust baseline without network enrichment", () => {
    const baseline = trustSurfaceDefinitionBaseline()
    const live = trustSurfaceDefinitionResolved(
      fallbackOpenStatusSnapshot({
        publicStatusUrl: "https://example.openstatus.dev",
        feedUrl: "https://example.openstatus.dev/feed/json",
        reason: "missing-config",
      })
    )

    expect(baseline.surfaces.length).toBe(
      trustSurfaceDefinition.surfaces.length
    )
    expect(
      live.currentPosture.find((posture) => posture.id === "operations-posture")
        ?.state
    ).toBe("live")
  })

  it("publishes every indexable trust/legal route in the sitemap", () => {
    const entries = sitemap()
    const paths = entries.map((entry) => new URL(entry.url).pathname)

    expect(paths).toContain(toLocalePath(DEFAULT_APP_LOCALE, "/"))
    for (const route of publicTrustIndexableRoutes) {
      expect(paths).toContain(toLocalePath(DEFAULT_APP_LOCALE, route))
    }

    const byPath = new Map(
      entries.map((entry) => [new URL(entry.url).pathname, entry])
    )
    expect(
      byPath.get(toLocalePath(DEFAULT_APP_LOCALE, "/legal-docs/cookies"))
        ?.lastModified
    ).toEqual(declarationRouteReviewedAtByHref["/legal-docs/cookies"])
    expect(
      byPath.get(toLocalePath(DEFAULT_APP_LOCALE, "/legal-docs/privacy"))
        ?.lastModified
    ).toEqual(declarationRouteReviewedAtByHref["/legal-docs/privacy"])
    expect(
      byPath.get(toLocalePath(DEFAULT_APP_LOCALE, "/"))?.lastModified
    ).toEqual(latestLegalDeclarationReviewedAt)
  })

  it("serves a machine-readable security.txt for the live disclosure surface", async () => {
    const response = await securityTxtGET()
    const body = await response.text()
    const base = getSiteUrl().replace(/\/$/, "")

    expect(response.headers.get("Content-Type")).toContain("text/plain")
    expect(body).toContain(
      `Contact: mailto:${publicTrustOwnerRoutes.security.value}`
    )
    expect(body).toContain(`Expires: ${securityTxtExpiresAt}`)
    expect(body).toContain(`Canonical: ${base}${securityTxtHref}`)
    expect(body).toContain(
      `Policy: ${base}${toLocalePath(DEFAULT_APP_LOCALE, securityDisclosureLink.href)}`
    )
  })

  it("keeps public trust routes truthful when status authority is missing", () => {
    expect(
      trustSurfaceDefinition.surfaces.filter(
        (surface) => surface.isPublicLink && surface.state !== "live"
      )
    ).toEqual([])

    expect(
      trustSurfaceDefinition.surfaces
        .filter((surface) => ["/legal-docs/status"].includes(surface.route))
        .map((surface) => ({
          route: surface.route,
          state: surface.state,
          isPublicLink: surface.isPublicLink,
          activationRuleId: surface.activationRuleId,
        }))
    ).toEqual([
      {
        route: "/legal-docs/status",
        state: "live",
        isPublicLink: true,
        activationRuleId: undefined,
      },
    ])
  })

  it("promotes operational posture when the OpenStatus authority is available", () => {
    const authority = "https://example.openstatus.dev"
    const resolved = trustSurfaceDefinitionResolved({
      ...fallbackOpenStatusSnapshot({
        publicStatusUrl: authority,
        feedUrl: `${authority}/feed/json`,
        reason: "missing-config",
      }),
      configured: true,
      available: true,
      publicStatusUrl: authority,
      feedUrl: `${authority}/feed/json`,
    })

    expect(
      resolved.currentPosture.find((p) => p.id === "operations-posture")
    ).toMatchObject({
      state: "live",
      href: authority,
    })

    expect(
      resolved.surfaces.filter(
        (surface) => surface.route === "/legal-docs/status"
      )
    ).toMatchObject([
      {
        state: "live",
        isPublicLink: true,
        authorityUrl: authority,
      },
    ])

    expect(
      resolved.evidence.some((e) => e.id === "evidence-openstatus-authority")
    ).toBe(true)
  })
})
