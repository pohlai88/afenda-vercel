import { describe, expect, it } from "vitest"

import sitemap from "../../app/sitemap"
import { GET as securityTxtGET } from "../../app/.well-known/security.txt/route"
import {
  declarationRouteReviewedAtByHref,
  latestLegalDeclarationReviewedAt,
  securityDisclosureLink,
} from "#features/legal-declarations"
import {
  fallbackOpenStatusSnapshot,
  publicTrustIndexableRoutes,
  publicTrustOwnerRoutes,
  securityTxtExpiresAt,
  securityTxtHref,
  trustSurfaceDefinition,
  trustSurfaceDefinitionResolved,
} from "#features/public-trust"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

describe("public trust routing", () => {
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
    const response = securityTxtGET()
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
