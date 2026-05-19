import { describe, expect, it } from "vitest"

import {
  dataProcessingAddendumLink,
  declarationDocuments,
  declarationFooterLinks,
} from "#features/legal-docs"
import {
  publicTrustIndexableRoutes,
  trustSurfaceDefinition,
} from "#features/legal-docs"

describe("data processing addendum public trust contract", () => {
  it("exposes a standalone DPA declaration at /legal-docs/data-processing-addendum", () => {
    expect(declarationDocuments["data-processing-addendum"].routeHref).toBe(
      "/legal-docs/data-processing-addendum"
    )
    expect(dataProcessingAddendumLink.href).toBe(
      "/legal-docs/data-processing-addendum"
    )
    expect(
      declarationFooterLinks.some(
        (link) => link.href === "/legal-docs/data-processing-addendum"
      )
    ).toBe(true)
  })

  it("marks the DPA trust surface as live and indexable", () => {
    const dpaSurface = trustSurfaceDefinition.surfaces.find(
      (surface) => surface.id === "surface-dpa"
    )

    expect(dpaSurface).toMatchObject({
      route: "/legal-docs/data-processing-addendum",
      state: "live",
      isPublicLink: true,
    })
    expect(dpaSurface?.activationRuleId).toBeUndefined()
    expect(publicTrustIndexableRoutes).toContain(
      "/legal-docs/data-processing-addendum"
    )
  })

  it("cites the Malaysia PDPA sections used for the DPA baseline", () => {
    const document = declarationDocuments["data-processing-addendum"]
    const copy = document.sections
      .flatMap((section) => [...section.body, ...(section.bullets ?? [])])
      .join(" ")

    expect(copy).toContain("Act 709 section 2")
    expect(copy).toContain("Act 709 section 4")
    expect(copy).toContain("Act 709 section 5")
    expect(copy).toContain("sections 6, 7, 8, 9, 10, 11, and 12")
    expect(copy).toContain("Act 709 section 129")
    expect(copy).toContain("Act A1727 sections 4 to 6 and 9")
    expect(copy).toContain(
      "https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/"
    )
    expect(copy).toContain(
      "https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/"
    )
  })

  it("keeps the public DPA route separate from a signed customer agreement", () => {
    const statusNote =
      declarationDocuments["data-processing-addendum"].statusNote ?? ""
    const boundary = trustSurfaceDefinition.boundaries.find(
      (item) => item.id === "boundary-dpa"
    )

    expect(statusNote).toContain("Customer-specific execution")
    expect(boundary?.title).toBe("No executed DPA implied by the public route")
  })
})
