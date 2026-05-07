import { describe, expect, it } from "vitest"

import {
  normalizeOrgSlugParam,
  ORG_SLUG_MAX_LENGTH,
} from "#lib/org-slug.shared"

describe("normalizeOrgSlugParam", () => {
  it("accepts lowercase kebab and single-segment slugs", () => {
    expect(normalizeOrgSlugParam("acme")).toBe("acme")
    expect(normalizeOrgSlugParam("acme-corp")).toBe("acme-corp")
    expect(normalizeOrgSlugParam("a1_b2-c3")).toBe("a1_b2-c3")
  })

  it("rejects empty, too long, path-ish, and invalid characters", () => {
    expect(normalizeOrgSlugParam("")).toBeNull()
    expect(normalizeOrgSlugParam("   ")).toBeNull()
    expect(normalizeOrgSlugParam("a/b")).toBeNull()
    expect(normalizeOrgSlugParam("a..b")).toBeNull()
    expect(normalizeOrgSlugParam("a\\b")).toBeNull()
    expect(normalizeOrgSlugParam("a b")).toBeNull()
    expect(normalizeOrgSlugParam("a@b")).toBeNull()
    expect(
      normalizeOrgSlugParam("a".repeat(ORG_SLUG_MAX_LENGTH + 1))
    ).toBeNull()
  })

  it("rejects percent-encoding that decodes to path separators", () => {
    expect(normalizeOrgSlugParam("x%2flegacy")).toBeNull()
    expect(normalizeOrgSlugParam("x%2Flegacy")).toBeNull()
  })

  it("allows benign percent-encoded hyphen in slug", () => {
    expect(normalizeOrgSlugParam("acme%2dhq")).toBe("acme-hq")
  })
})
