import { describe, expect, it } from "vitest"

import enMessages from "../../messages/en.json"

// Deep-import the registry to avoid loading the components barrel (next-intl)
// in node environment unit tests. Tests are exempt from the deep-import lint.
import {
  ORG_ADMIN_CAPABILITIES,
  ORG_ADMIN_EVENT_NAMESPACES,
  ORG_ADMIN_OVERVIEW_NAV_KEY,
  buildOrgAdminNav,
  getAllowedAdminSegments,
  getCapabilityById,
  getCapabilityForSegment,
  isAllowedAuditAction,
  isAllowedOrgAdminSegment,
  orgAdminNavLabelKey,
  organizationAdminPath,
} from "#features/org-admin/constants"
import { ORG_ADMIN_NAV_NAMESPACE } from "#features/org-admin/types"

import { sanitizePathAfterOrgSlug } from "#lib/dashboard-org-path.shared"

const NAV_MESSAGES = (enMessages as Record<string, unknown>).OrgAdmin as {
  nav: Record<string, string>
}

const TEST_SLUG = "acme-co"

describe("ORG_ADMIN_CAPABILITIES registry", () => {
  it("has at least one capability with at least one segment", () => {
    expect(ORG_ADMIN_CAPABILITIES.length).toBeGreaterThan(0)
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      expect(capability.segments.length).toBeGreaterThan(0)
    }
  })

  it("uses unique capability ids and unique segments", () => {
    const ids = ORG_ADMIN_CAPABILITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)

    const segments = ORG_ADMIN_CAPABILITIES.flatMap((c) => [...c.segments])
    expect(new Set(segments).size).toBe(segments.length)
  })

  it("audit prefix uses a registered event namespace", () => {
    const namespaces = new Set<string>(ORG_ADMIN_EVENT_NAMESPACES)
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      const dot = capability.auditPrefix.indexOf(".")
      expect(dot).toBeGreaterThan(0)
      expect(namespaces.has(capability.auditPrefix.slice(0, dot))).toBe(true)
    }
  })

  it("nav metadata references a registered segment and a present i18n key", () => {
    expect(NAV_MESSAGES.nav[ORG_ADMIN_OVERVIEW_NAV_KEY]).toBeTypeOf("string")
    expect(NAV_MESSAGES.nav.aria).toBeTypeOf("string")

    for (const capability of ORG_ADMIN_CAPABILITIES) {
      if (!capability.nav) continue
      expect(capability.segments).toContain(capability.nav.primarySegment)
      expect(NAV_MESSAGES.nav[capability.nav.navKey]).toBeTypeOf("string")
    }
  })

  it("ORG_ADMIN_NAV_NAMESPACE matches the messages namespace", () => {
    expect(ORG_ADMIN_NAV_NAMESPACE).toBe("OrgAdmin.nav")
  })
})

describe("registry-derived path helpers", () => {
  it("organizationAdminPath builds /o/<slug>/admin and /o/<slug>/admin/<segment>", () => {
    expect(organizationAdminPath(TEST_SLUG, "overview")).toBe(
      `/o/${TEST_SLUG}/admin`
    )
    for (const segment of getAllowedAdminSegments()) {
      expect(organizationAdminPath(TEST_SLUG, segment)).toBe(
        `/o/${TEST_SLUG}/admin/${segment}`
      )
    }
  })

  it("organizationAdminPath rejects unknown segments and bad slugs", () => {
    expect(() => organizationAdminPath(TEST_SLUG, "unknown")).toThrow()
    expect(() => organizationAdminPath("", "overview")).toThrow()
  })

  it("isAllowedOrgAdminSegment matches the registry exactly", () => {
    for (const segment of getAllowedAdminSegments()) {
      expect(isAllowedOrgAdminSegment(segment)).toBe(true)
    }
    for (const bad of ["", "evil", "MEMBERS", "members/extra", "../audit"]) {
      expect(isAllowedOrgAdminSegment(bad)).toBe(false)
    }
  })

  it("getCapabilityForSegment returns the owning capability", () => {
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      for (const segment of capability.segments) {
        expect(getCapabilityForSegment(segment)?.id).toBe(capability.id)
      }
    }
    expect(getCapabilityForSegment("evil")).toBeNull()
  })

  it("getCapabilityById round-trips for every registered id", () => {
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      expect(getCapabilityById(capability.id)?.id).toBe(capability.id)
    }
    // String ids not in the registry (including removed placeholders) return null.
    expect(getCapabilityById("operations")).toBeNull()
  })

  it("orgAdminNavLabelKey produces the canonical OrgAdmin.nav.<key>", () => {
    expect(orgAdminNavLabelKey(ORG_ADMIN_OVERVIEW_NAV_KEY)).toBe(
      "OrgAdmin.nav.overview"
    )
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      if (!capability.nav) continue
      expect(orgAdminNavLabelKey(capability.nav.navKey)).toBe(
        `OrgAdmin.nav.${capability.nav.navKey}`
      )
    }
  })

  it("sanitizePathAfterOrgSlug accepts every registered admin segment", () => {
    for (const segment of getAllowedAdminSegments()) {
      expect(sanitizePathAfterOrgSlug(`/admin/${segment}`)).toBe(
        `/admin/${segment}`
      )
    }
  })
})

describe("buildOrgAdminNav", () => {
  it("contains every nav-bearing capability and is order-stable", () => {
    const nav = buildOrgAdminNav(TEST_SLUG)
    const navCapabilityIds = nav.map((item) => item.capabilityId)
    const expectedIds = ORG_ADMIN_CAPABILITIES.filter(
      (c) => c.nav !== null
    ).map((c) => c.id)

    expect(new Set(navCapabilityIds)).toEqual(new Set(expectedIds))

    for (let i = 1; i < nav.length; i += 1) {
      expect(nav[i - 1]!.order).toBeLessThan(nav[i]!.order)
    }

    for (const item of nav) {
      expect(item.href.startsWith(`/o/${TEST_SLUG}/admin/`)).toBe(true)
      expect(NAV_MESSAGES.nav[item.navKey]).toBeTypeOf("string")
    }
  })
})

describe("isAllowedAuditAction", () => {
  it("accepts capability audit prefixes with a verb", () => {
    for (const capability of ORG_ADMIN_CAPABILITIES) {
      expect(isAllowedAuditAction(`${capability.auditPrefix}.create`)).toBe(
        true
      )
    }
  })

  it("accepts every namespace + verb form", () => {
    for (const namespace of ORG_ADMIN_EVENT_NAMESPACES) {
      expect(isAllowedAuditAction(`${namespace}.thing.do`)).toBe(true)
    }
  })

  it("rejects unknown namespaces and malformed actions", () => {
    expect(isAllowedAuditAction("evil.do")).toBe(false)
    expect(isAllowedAuditAction("noseparator")).toBe(false)
    expect(isAllowedAuditAction("")).toBe(false)
    expect(isAllowedAuditAction(".starts.with.dot")).toBe(false)
  })
})
