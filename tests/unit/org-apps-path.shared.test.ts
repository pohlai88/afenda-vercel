import { describe, expect, it } from "vitest"

import { getAllowedHrmAppsSubsegments } from "#features/hrm/constants"

import { sanitizePathAfterOrgSlug } from "#lib/i18n/org-apps-path.shared"

describe("sanitizePathAfterOrgSlug", () => {
  it("normalizes apps tails and rejects traversal-ish input", () => {
    expect(sanitizePathAfterOrgSlug("")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/nexus")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/nexus/settings")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/apps")).toBe("/apps")
    expect(sanitizePathAfterOrgSlug("/apps/contacts")).toBe("/apps/contacts")
    expect(sanitizePathAfterOrgSlug("/apps/knowledge")).toBe("/apps/knowledge")
    expect(sanitizePathAfterOrgSlug("/apps/lynx")).toBe("/apps/lynx")
    expect(sanitizePathAfterOrgSlug("/apps/orbit")).toBe("/apps/orbit")
    expect(sanitizePathAfterOrgSlug("/apps/ithink")).toBe("/apps")
    expect(sanitizePathAfterOrgSlug("/apps/orbit/today")).toBe(
      "/apps/orbit/today"
    )
    expect(sanitizePathAfterOrgSlug("/apps/orbit/links")).toBe(
      "/apps/orbit/links"
    )
    expect(sanitizePathAfterOrgSlug("/apps/orbit/evil")).toBe("/apps/orbit")
    expect(sanitizePathAfterOrgSlug("/apps/hrm")).toBe("/apps/hrm")
    for (const segment of getAllowedHrmAppsSubsegments()) {
      expect(sanitizePathAfterOrgSlug(`/apps/hrm/${segment}`)).toBe(
        `/apps/hrm/${segment}`
      )
    }
    expect(sanitizePathAfterOrgSlug("/apps/hrm/evil")).toBe("/apps/hrm")
    const employeeDetailUuid = "550e8400-e29b-41d4-a716-446655440000"
    expect(
      sanitizePathAfterOrgSlug(`/apps/hrm/employees/${employeeDetailUuid}`)
    ).toBe(`/apps/hrm/employees/${employeeDetailUuid}`)
    expect(sanitizePathAfterOrgSlug("/apps/hrm/employees/not-a-uuid")).toBe(
      "/apps/hrm"
    )
    expect(sanitizePathAfterOrgSlug("/apps/onething")).toBe("/apps")
    expect(sanitizePathAfterOrgSlug("/apps/../contacts")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/account/security")).toBe(
      "/account/security"
    )
    expect(sanitizePathAfterOrgSlug("/apps/contacts/extra")).toBe("/apps")
  })

  it("maps legacy /dashboard tails to /apps", () => {
    expect(sanitizePathAfterOrgSlug("/dashboard/contacts")).toBe(
      "/apps/contacts"
    )
    expect(sanitizePathAfterOrgSlug("/dashboard/hrm/payroll")).toBe(
      "/apps/hrm/payroll"
    )
  })

  it("maps legacy /marketplace tails to nexus", () => {
    expect(sanitizePathAfterOrgSlug("/marketplace")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/marketplace/utilities")).toBe("/nexus")
  })

  it("allows org admin tails", () => {
    expect(sanitizePathAfterOrgSlug("/admin")).toBe("/admin")
    expect(sanitizePathAfterOrgSlug("/admin/members")).toBe("/admin/members")
    expect(sanitizePathAfterOrgSlug("/admin/audit")).toBe("/admin/audit")
    expect(sanitizePathAfterOrgSlug("/admin/feedback")).toBe("/admin/feedback")
    expect(sanitizePathAfterOrgSlug("/admin/knowledge")).toBe(
      "/admin/knowledge"
    )
    expect(sanitizePathAfterOrgSlug("/admin/knowledge/sources")).toBe(
      "/admin/knowledge/sources"
    )
    const evalRunUuid = "550e8400-e29b-41d4-a716-446655440000"
    expect(
      sanitizePathAfterOrgSlug(`/admin/knowledge/sources/runs/${evalRunUuid}`)
    ).toBe(`/admin/knowledge/sources/runs/${evalRunUuid}`)
    expect(sanitizePathAfterOrgSlug("/admin/evil")).toBe("/nexus")
    expect(sanitizePathAfterOrgSlug("/admin/members/extra")).toBe("/nexus")
    expect(
      sanitizePathAfterOrgSlug("/admin/knowledge/sources/runs/not-a-uuid")
    ).toBe("/nexus")
  })
})
