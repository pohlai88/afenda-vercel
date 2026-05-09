import { describe, expect, it } from "vitest"

import {
  collectDeclarationCopy,
  declarationDocuments,
  declarationPlaceholderPatterns,
  declarationRouteReviewedAtByHref,
  declarationStalePhrases,
  formatDeclarationReviewedLabel,
  latestLegalDeclarationReviewedAt,
} from "#features/legal-declarations"
import { trustSurfaceDefinition } from "#features/public-trust"

describe("legal declarations contract", () => {
  it("gives every declaration reviewed metadata and source refs", () => {
    for (const document of Object.values(declarationDocuments)) {
      expect(document.title).not.toHaveLength(0)
      expect(document.summary).not.toHaveLength(0)
      expect(document.sections.length).toBeGreaterThan(0)
      expect(document.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(document.sourceRefs.length).toBeGreaterThan(0)
      expect(document.lastUpdatedLabel).toBe(
        formatDeclarationReviewedLabel(document.reviewedAt)
      )
    }
  })

  it("stays free of placeholder and stale-route copy", () => {
    for (const [slug, document] of Object.entries(declarationDocuments)) {
      const allCopy = [
        document.title,
        document.description,
        document.summary,
        collectDeclarationCopy(document.sections),
      ].join(" ")

      for (const pattern of declarationPlaceholderPatterns) {
        expect(allCopy, `${slug} matched ${pattern}`).not.toMatch(pattern)
      }

      for (const phrase of declarationStalePhrases) {
        expect(allCopy, `${slug} contained ${phrase}`).not.toContain(phrase)
      }
    }
  })

  it("tracks route freshness from the declaration registry", () => {
    expect(declarationRouteReviewedAtByHref["/legal-docs/cookies"]).toBe(
      declarationDocuments.cookies.reviewedAt
    )
    expect(
      declarationRouteReviewedAtByHref["/legal-docs/data-processing-addendum"]
    ).toBe(declarationDocuments["data-processing-addendum"].reviewedAt)
    expect(declarationRouteReviewedAtByHref["/legal-docs/subprocessors"]).toBe(
      declarationDocuments.subprocessors.reviewedAt
    )
    expect(declarationRouteReviewedAtByHref["/legal-docs/privacy"]).toBe(
      declarationDocuments.privacy.reviewedAt
    )
    expect(latestLegalDeclarationReviewedAt).toBe(
      declarationDocuments.cookies.reviewedAt
    )
  })

  it("keeps trust-route freshness aligned with the declaration registry", () => {
    expect(
      trustSurfaceDefinition.surfaces.find(
        (surface) => surface.route === "/legal-docs/cookies"
      )?.lastUpdatedLabel
    ).toBe(
      formatDeclarationReviewedLabel(declarationDocuments.cookies.reviewedAt)
    )
    expect(
      trustSurfaceDefinition.surfaces.find(
        (surface) => surface.route === "/legal-docs/data-processing-addendum"
      )?.lastUpdatedLabel
    ).toBe(
      formatDeclarationReviewedLabel(
        declarationDocuments["data-processing-addendum"].reviewedAt
      )
    )
    expect(
      trustSurfaceDefinition.surfaces.find(
        (surface) => surface.route === "/legal-docs/subprocessors"
      )?.lastUpdatedLabel
    ).toBe(
      formatDeclarationReviewedLabel(
        declarationDocuments.subprocessors.reviewedAt
      )
    )
  })
})
