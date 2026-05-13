import { describe, expect, it } from "vitest"

import {
  declarationDocuments,
  declarationFooterLinks,
} from "#features/legal-declarations"
import {
  publicTrustIndexableRoutes,
  trustSurfaceDefinition,
} from "#features/public-trust"

describe("cookie notice public trust contract", () => {
  it("exposes a standalone cookie declaration at /legal-docs/cookies", () => {
    expect(declarationDocuments.cookies.routeHref).toBe("/legal-docs/cookies")
    expect(
      declarationFooterLinks.some((link) => link.href === "/legal-docs/cookies")
    ).toBe(true)
  })

  it("marks the cookie trust surface as live and indexable", () => {
    const cookieSurface = trustSurfaceDefinition.surfaces.find(
      (surface) => surface.id === "surface-cookies"
    )

    expect(cookieSurface).toMatchObject({
      route: "/legal-docs/cookies",
      state: "live",
      isPublicLink: true,
    })
    expect(cookieSurface?.activationRuleId).toBeUndefined()
    expect(publicTrustIndexableRoutes).toContain("/legal-docs/cookies")
  })

  it("does not claim non-essential tracking categories", () => {
    const nonEssentialSection = declarationDocuments.cookies.sections.find(
      (section) => section.id === "non-essential-categories"
    )

    expect(nonEssentialSection?.body.join(" ")).toContain(
      "does not currently publish non-essential analytics, advertising, retargeting, or behavioural profiling cookie categories"
    )
  })

  it("names the current first-party storage inventory", () => {
    const storageSection = declarationDocuments.cookies.sections.find(
      (section) => section.id === "current-storage"
    )
    const storageCopy = [
      ...(storageSection?.body ?? []),
      ...(storageSection?.bullets ?? []),
    ].join(" ")

    expect(storageCopy).toContain("__Secure-neon-auth.session_token")
    expect(storageCopy).toContain("NEXT_LOCALE")
    expect(storageCopy).toContain("sidebar_state")
    expect(storageCopy).toContain("sidebar_width")
    expect(storageCopy).toContain("inspector_state")
    expect(storageCopy).toContain("inspector_width")
    expect(storageCopy).toContain("afenda:lynx-summon-fab-pos")
    expect(storageCopy).toContain("afenda:dev-signin-panel-pos")
    expect(storageCopy).toContain("not used for advertising")
  })
})
