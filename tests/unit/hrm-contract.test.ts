import { describe, expect, it } from "vitest"

import enMessages from "../../messages/en.json"

// Tests are exempt from the deep-import lint — keep Node graph light (no RSC barrels).
import { isAllowedAuditAction } from "#features/org-admin/constants"
import {
  HRM_CAPABILITIES,
  buildHrmNav,
  getAllowedHrmDashboardSubsegments,
  getHrmAuditPrefixes,
  getHrmCapabilityById,
  getHrmCapabilityForSegment,
  hrmNavLabelKey,
  isAllowedHrmDashboardSubsegment,
  organizationHrmEmployeePath,
  organizationHrmPath,
  organizationHrmRootPath,
} from "#features/hrm/constants"
import { HRM_NAV_NAMESPACE } from "#features/hrm/types"

import { HRM_DASHBOARD_CAPABILITY_SEGMENTS } from "#features/hrm/hrm-dashboard-path.shared"

import {
  DASHBOARD_NAV_MODULES,
  organizationDashboardPath,
} from "#lib/dashboard-module-paths"

import {
  HRM_REVIEW_CYCLE_STATES,
  HRM_REVIEW_ROW_STATE,
  HRM_REVIEW_ROW_STATES,
  hrmReviewCycleStateSchema,
  hrmReviewRowStateSchema,
} from "../../lib/features/hrm/talent-management/performance-management/schemas/performance.schema"

const HRM_MESSAGES = (
  enMessages as unknown as {
    Dashboard: {
      Hrm: {
        nav: Record<string, string>
        shell: Record<string, string>
        cards: Record<string, Record<string, string>>
        placeholders: Record<string, Record<string, string>>
      }
    }
  }
).Dashboard.Hrm

const TEST_SLUG = "acme-co"

describe("HRM_CAPABILITIES registry", () => {
  it("covers every forwarded-path segment exactly once", () => {
    const registry = new Set(getAllowedHrmDashboardSubsegments())
    const shared = new Set<string>(HRM_DASHBOARD_CAPABILITY_SEGMENTS)
    expect(registry.size).toBe(HRM_DASHBOARD_CAPABILITY_SEGMENTS.length)
    expect(registry).toEqual(shared)
    for (const segment of HRM_DASHBOARD_CAPABILITY_SEGMENTS) {
      expect(isAllowedHrmDashboardSubsegment(segment)).toBe(true)
    }
    expect(isAllowedHrmDashboardSubsegment("evil")).toBe(false)
  })

  it("uses unique capability ids and unique segments", () => {
    const ids = HRM_CAPABILITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)

    const segments = HRM_CAPABILITIES.flatMap((c) => [...c.segments])
    expect(new Set(segments).size).toBe(segments.length)
  })

  it("audit prefixes are erp.hrm.* and pass org-admin audit gate", () => {
    for (const prefix of getHrmAuditPrefixes()) {
      expect(prefix.startsWith("erp.hrm.")).toBe(true)
      expect(isAllowedAuditAction(`${prefix}.noop`)).toBe(true)
    }
  })

  it("nav metadata references a registered segment and message catalog keys", () => {
    for (const capability of HRM_CAPABILITIES) {
      expect(capability.segments).toContain(capability.nav.primarySegment)
      expect(HRM_MESSAGES.nav[capability.nav.navKey]).toBeTypeOf("string")
      expect(HRM_MESSAGES.cards[capability.nav.navKey]?.title).toBeTypeOf(
        "string"
      )
      expect(HRM_MESSAGES.cards[capability.nav.navKey]?.description).toBeTypeOf(
        "string"
      )
      expect(
        HRM_MESSAGES.placeholders[capability.nav.navKey]?.title
      ).toBeTypeOf("string")
      expect(HRM_MESSAGES.placeholders[capability.nav.navKey]?.body).toBeTypeOf(
        "string"
      )
    }
  })

  it("imports capability uses hrm.import.search permission", () => {
    const imports = getHrmCapabilityById("imports")
    expect(imports?.requiredPermission).toBe("hrm.import.search")
  })

  it("registers onboarding and performance audit prefixes", () => {
    const prefixes = getHrmAuditPrefixes()
    expect(prefixes).toContain("erp.hrm.onboarding")
    expect(prefixes).toContain("erp.hrm.performance")
  })

  it("HRM_NAV_NAMESPACE matches Dashboard.Hrm.nav", () => {
    expect(HRM_NAV_NAMESPACE).toBe("Dashboard.Hrm.nav")
  })

  it("getHrmCapabilityForSegment matches capability ids", () => {
    for (const capability of HRM_CAPABILITIES) {
      for (const segment of capability.segments) {
        expect(getHrmCapabilityForSegment(segment)?.id).toBe(capability.id)
      }
    }
    expect(getHrmCapabilityForSegment("unknown")).toBeNull()
  })

  it("getHrmCapabilityById resolves registered ids", () => {
    for (const capability of HRM_CAPABILITIES) {
      expect(getHrmCapabilityById(capability.id)?.id).toBe(capability.id)
    }
  })
})

describe("HRM path helpers", () => {
  it("organizationHrmRootPath matches organizationDashboardPath(..., hrm)", () => {
    expect(organizationHrmRootPath(TEST_SLUG)).toBe(
      organizationDashboardPath(TEST_SLUG, "hrm")
    )
  })

  it("organizationHrmPath builds /o/<slug>/dashboard/hrm/<segment>", () => {
    expect(organizationHrmPath(TEST_SLUG, "overview")).toBe(
      `/o/${TEST_SLUG}/dashboard/hrm`
    )
    for (const segment of getAllowedHrmDashboardSubsegments()) {
      expect(organizationHrmPath(TEST_SLUG, segment)).toBe(
        `/o/${TEST_SLUG}/dashboard/hrm/${segment}`
      )
    }
  })

  it("organizationHrmPath rejects unknown segments and bad slugs", () => {
    expect(() => organizationHrmPath(TEST_SLUG, "evil" as never)).toThrow()
    expect(() => organizationHrmPath("", "overview")).toThrow()
  })

  it("organizationHrmEmployeePath builds employee detail URLs", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000"
    expect(organizationHrmEmployeePath(TEST_SLUG, id)).toBe(
      `/o/${TEST_SLUG}/dashboard/hrm/employees/${id}`
    )
  })

  it("buildHrmNav produces stable ordering", () => {
    const nav = buildHrmNav(TEST_SLUG)
    const orders = nav.map((item) => item.order)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
    expect(nav.length).toBe(HRM_CAPABILITIES.length)
  })

  it("hrmNavLabelKey matches messages namespace", () => {
    expect(hrmNavLabelKey("employees")).toBe("Dashboard.Hrm.nav.employees")
  })
})

describe("Dashboard nav registry parity", () => {
  it("includes hrm in DASHBOARD_NAV_MODULES", () => {
    expect(DASHBOARD_NAV_MODULES.includes("hrm")).toBe(true)
  })
})

describe("HRM performance state registry", () => {
  it("accepts only canonical cycle states", () => {
    for (const s of HRM_REVIEW_CYCLE_STATES) {
      expect(hrmReviewCycleStateSchema.safeParse(s).success).toBe(true)
    }
    expect(hrmReviewCycleStateSchema.safeParse("bogus").success).toBe(false)
  })

  it("accepts only canonical review row states", () => {
    for (const s of HRM_REVIEW_ROW_STATES) {
      expect(hrmReviewRowStateSchema.safeParse(s).success).toBe(true)
    }
    expect(hrmReviewRowStateSchema.safeParse("").success).toBe(false)
  })

  it("exposes stable row state object values on the tuple", () => {
    const values = new Set(HRM_REVIEW_ROW_STATES)
    expect(values.has(HRM_REVIEW_ROW_STATE.selfPending)).toBe(true)
    expect(values.has(HRM_REVIEW_ROW_STATE.submitted)).toBe(true)
    expect(values.has(HRM_REVIEW_ROW_STATE.acknowledged)).toBe(true)
  })
})
