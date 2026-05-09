import { describe, expect, it } from "vitest"

import sitemap from "../../app/sitemap"
import { GET as securityTxtGET } from "../../app/.well-known/security.txt/route"
import { securityDisclosureLink } from "#features/legal-declarations"
import {
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
    const paths = sitemap().map((entry) => new URL(entry.url).pathname)

    expect(paths).toContain(toLocalePath(DEFAULT_APP_LOCALE, "/"))
    for (const route of publicTrustIndexableRoutes) {
      expect(paths).toContain(toLocalePath(DEFAULT_APP_LOCALE, route))
    }
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

  it("keeps unbacked trust surfaces gated", () => {
    expect(
      trustSurfaceDefinition.surfaces.filter(
        (surface) => surface.isPublicLink && surface.state !== "live"
      )
    ).toEqual([])

    expect(
      trustSurfaceDefinition.surfaces
        .filter((surface) => ["/status"].includes(surface.route))
        .map((surface) => ({
          route: surface.route,
          state: surface.state,
          isPublicLink: surface.isPublicLink,
          activationRuleId: surface.activationRuleId,
        }))
    ).toEqual([
      {
        route: "/status",
        state: "planned",
        isPublicLink: false,
        activationRuleId: "TRUST-STATUS-001",
      },
    ])
  })

  it("promotes operational posture when OPENSTATUS_PUBLIC_STATUS_URL is configured", () => {
    const authority = "https://example.openstatus.dev"
    const resolved = trustSurfaceDefinitionResolved(authority)

    expect(
      resolved.currentPosture.find((p) => p.id === "operations-posture")
    ).toMatchObject({
      state: "live",
      href: authority,
    })

    expect(
      resolved.surfaces.filter((surface) => surface.route === "/status")
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

    const statusRule = resolved.activationRules.find(
      (r) => r.id === "TRUST-STATUS-001"
    )
    expect(statusRule?.requirements[0]).toContain(authority)
  })
})
