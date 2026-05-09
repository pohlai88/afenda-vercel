import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  declarationFooterIdentity,
  securityDisclosureLink,
  trustRouteLink,
} from "#features/legal-declarations"
import {
  landingFooterActionLinks,
  landingFooterContactRoutes,
  landingFooterDeclarationLinks,
  landingFooterTrustLinks,
} from "#components/marketing/landing-footer.content"

const ROOT = process.cwd()

function readProjectFile(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf-8")
}

describe("landing footer", () => {
  it("ports the legacy footer groups onto current declaration routes", () => {
    expect(landingFooterDeclarationLinks.length).toBeGreaterThan(0)
    expect(landingFooterTrustLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: trustRouteLink.href }),
        expect.objectContaining({ href: securityDisclosureLink.href }),
        expect.objectContaining({ href: "/cookies" }),
      ])
    )
    expect(landingFooterActionLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Application entry",
          href: "/sign-in",
        }),
        expect.objectContaining({
          href: `mailto:${declarationFooterIdentity.operationalSupportEmail}`,
        }),
      ])
    )
    expect(landingFooterContactRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: declarationFooterIdentity.websiteValue,
        }),
        expect.objectContaining({
          value: declarationFooterIdentity.operationalSupportEmail,
        }),
        expect.objectContaining({
          value: declarationFooterIdentity.privacyInquiryEmail,
        }),
      ])
    )
  })

  it("renders the borrowed footer surface on the landing page", () => {
    const footer = readProjectFile(
      "components",
      "marketing",
      "landing-footer.tsx"
    )
    const page = readProjectFile("app", "[locale]", "page.tsx")

    expect(footer).toContain("Footer declarations")
    expect(footer).toContain("Trust routes")
    expect(footer).toContain("Footer actions")
    expect(footer).toContain("Footer explore links")
    expect(page).toContain("<LandingFooter />")
  })
})

describe("trust layout", () => {
  it("uses the legal declaration shell layout vocabulary", () => {
    const trust = readProjectFile(
      "components",
      "marketing",
      "trust-control-surface.tsx"
    )

    expect(trust).toContain("max-w-[1240px] px-4 pt-4 sm:px-6")
    expect(trust).toContain("lg:grid-cols-[minmax(236px,272px)_minmax(0,1fr)]")
    expect(trust).toContain("Trust control surface")
    expect(trust).toContain("Related routes")
    expect(trust).toContain("Contact routes")
    expect(trust).toContain("<article")
  })
})

describe("legal and trust brand lockups", () => {
  it("uses the shared light/dark brand component instead of the raw SVG lockup", () => {
    const declaration = readProjectFile(
      "components",
      "marketing",
      "declaration-shell.tsx"
    )
    const trust = readProjectFile(
      "components",
      "marketing",
      "trust-control-surface.tsx"
    )

    expect(declaration).toContain("AfendaBrandLockup")
    expect(trust).toContain("AfendaBrandLockup")
    expect(declaration).not.toContain("BRAND_COMBINED_LOCKUP_SVG")
    expect(trust).not.toContain("BRAND_COMBINED_LOCKUP_SVG")
  })
})
