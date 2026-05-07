import { describe, expect, it } from "vitest"

import {
  legacyDashboardSegmentsToTail,
  sanitizePathAfterOrgSlug,
} from "#lib/dashboard-org-path.shared"

describe("legacyDashboardSegmentsToTail", () => {
  it("defaults to contacts and allows one known module", () => {
    expect(legacyDashboardSegmentsToTail(undefined)).toBe("/contacts")
    expect(legacyDashboardSegmentsToTail([])).toBe("/contacts")
    expect(legacyDashboardSegmentsToTail(["contacts"])).toBe("/contacts")
    expect(legacyDashboardSegmentsToTail(["sale"])).toBe("/sale")
    expect(legacyDashboardSegmentsToTail(["contacts", "x"])).toBe("/contacts")
    expect(legacyDashboardSegmentsToTail(["../admin"])).toBe("/contacts")
    expect(legacyDashboardSegmentsToTail(["evil"])).toBe("/contacts")
  })
})

describe("sanitizePathAfterOrgSlug", () => {
  it("normalizes dashboard tails and rejects traversal-ish input", () => {
    expect(sanitizePathAfterOrgSlug("")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard/contacts")).toBe(
      "/dashboard/contacts"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/../contacts")).toBe(
      "/dashboard"
    )
    expect(sanitizePathAfterOrgSlug("/account/security")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard/contacts/extra")).toBe(
      "/dashboard"
    )
  })
})
