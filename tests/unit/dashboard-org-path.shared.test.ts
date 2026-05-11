import { describe, expect, it } from "vitest"

import { getAllowedHrmDashboardSubsegments } from "#features/hrm/constants"

import { sanitizePathAfterOrgSlug } from "#lib/dashboard-org-path.shared"

describe("sanitizePathAfterOrgSlug", () => {
  it("normalizes dashboard tails and rejects traversal-ish input", () => {
    expect(sanitizePathAfterOrgSlug("")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/nexus")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/nexus/settings")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/dashboard")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard/contacts")).toBe(
      "/dashboard/contacts"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/knowledge")).toBe(
      "/dashboard/knowledge"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/lynx")).toBe("/dashboard/lynx")
    expect(sanitizePathAfterOrgSlug("/dashboard/orbit")).toBe(
      "/dashboard/orbit"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/ithink")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard/orbit/today")).toBe(
      "/dashboard/orbit/today"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/orbit/links")).toBe(
      "/dashboard/orbit/links"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/orbit/evil")).toBe(
      "/dashboard/orbit"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/hrm")).toBe("/dashboard/hrm")
    for (const segment of getAllowedHrmDashboardSubsegments()) {
      expect(sanitizePathAfterOrgSlug(`/dashboard/hrm/${segment}`)).toBe(
        `/dashboard/hrm/${segment}`
      )
    }
    expect(sanitizePathAfterOrgSlug("/dashboard/hrm/evil")).toBe(
      "/dashboard/hrm"
    )
    const employeeDetailUuid = "550e8400-e29b-41d4-a716-446655440000"
    expect(
      sanitizePathAfterOrgSlug(`/dashboard/hrm/employees/${employeeDetailUuid}`)
    ).toBe(`/dashboard/hrm/employees/${employeeDetailUuid}`)
    expect(
      sanitizePathAfterOrgSlug("/dashboard/hrm/employees/not-a-uuid")
    ).toBe("/dashboard/hrm")
    expect(sanitizePathAfterOrgSlug("/dashboard/onething")).toBe("/dashboard")
    expect(sanitizePathAfterOrgSlug("/dashboard/../contacts")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/account/security")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/dashboard/contacts/extra")).toBe(
      "/dashboard"
    )
  })

  it("allows org admin workbench tails", () => {
    expect(sanitizePathAfterOrgSlug("/admin")).toBe("/admin")
    expect(sanitizePathAfterOrgSlug("/admin/members")).toBe("/admin/members")
    expect(sanitizePathAfterOrgSlug("/admin/audit")).toBe("/admin/audit")
    expect(sanitizePathAfterOrgSlug("/admin/feedback")).toBe("/admin/feedback")
    expect(sanitizePathAfterOrgSlug("/admin/evil")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/admin/members/extra")).toBe("/nexus")
  })
})
