import { describe, expect, it } from "vitest"

import {
  isReservedOrgSlug,
  RESERVED_ORG_SLUGS,
  slugifyOrganizationName,
} from "#lib/org-slug-generate.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

describe("slugifyOrganizationName", () => {
  it("slugifies simple names", () => {
    expect(slugifyOrganizationName("Acme Corporation")).toBe("acme-corporation")
  })

  it("strips diacritics", () => {
    expect(slugifyOrganizationName("Café René")).toBe("cafe-rene")
  })

  it("returns empty for blank input", () => {
    expect(slugifyOrganizationName("   ")).toBe("")
  })
})

describe("RESERVED_ORG_SLUGS", () => {
  it("contains high-risk route-like tokens", () => {
    for (const s of ["admin", "sign-in", "o", "api"]) {
      expect(RESERVED_ORG_SLUGS.has(s)).toBe(true)
    }
  })
})

describe("isReservedOrgSlug", () => {
  it("is case-insensitive", () => {
    expect(isReservedOrgSlug("Admin")).toBe(true)
  })
})

describe("normalize + slugify integration", () => {
  it("accepts typical slugify output for ORG pattern", () => {
    const s = slugifyOrganizationName("My Company 2024")
    const n = normalizeOrgSlugParam(s)
    expect(n).toBe("my-company-2024")
  })
})
