import { describe, expect, it } from "vitest"

import enMessages from "../../messages/en.json"

// Tests are exempt from the deep-import lint — keep Node graph light (no RSC barrels).
import { isAllowedAuditAction } from "#features/org-admin/constants"
import {
  HRM_CAPABILITIES,
  buildHrmNav,
  getAllowedHrmAppsSubsegments,
  getHrmAuditPrefixes,
  getHrmCapabilityById,
  getHrmCapabilityForSegment,
  hrmNavLabelKey,
  isAllowedHrmAppsSubsegment,
  organizationHrmEmployeePath,
  organizationHrmPath,
  organizationHrmRootPath,
} from "#features/hrm/constants"
import { HRM_NAV_NAMESPACE } from "#features/hrm/types"

import { HRM_APPS_CAPABILITY_SEGMENTS } from "#features/hrm/hrm-apps-path.shared"

import {
  APPS_NAV_MODULES,
  organizationAppsPath,
} from "#lib/org-apps-module-paths"

import {
  HRM_REVIEW_CYCLE_STATES,
  HRM_REVIEW_ROW_STATE,
  HRM_REVIEW_ROW_STATES,
  hrmReviewCycleStateSchema,
  hrmReviewRowStateSchema,
} from "../../lib/features/hrm/talent-management/performance-appraisals/schemas/performance.schema"

const HRM_MESSAGES = (
  enMessages as unknown as {
    Dashboard: {
      Hrm: {
        nav: Record<string, string>
        shell: Record<string, string>
        cards: Record<string, Record<string, string>>
        placeholders: Record<string, Record<string, string>>
        flexibleWork?: Record<string, string>
        overtime?: Record<string, string>
        absenceAnalytics?: Record<string, string>
        compensationPlanning?: Record<string, string>
      }
    }
  }
).Dashboard.Hrm

const TEST_SLUG = "acme-co"

describe("HRM_CAPABILITIES registry", () => {
  it("covers every forwarded-path segment exactly once", () => {
    const registry = new Set(getAllowedHrmAppsSubsegments())
    const shared = new Set<string>(HRM_APPS_CAPABILITY_SEGMENTS)
    expect(registry.size).toBe(HRM_APPS_CAPABILITY_SEGMENTS.length)
    expect(registry).toEqual(shared)
    for (const segment of HRM_APPS_CAPABILITY_SEGMENTS) {
      expect(isAllowedHrmAppsSubsegment(segment)).toBe(true)
    }
    expect(isAllowedHrmAppsSubsegment("evil")).toBe(false)
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

  it("registers compensation-planning capability and catalog keys", () => {
    const compensationPlanning = getHrmCapabilityById("compensationPlanning")
    expect(compensationPlanning?.segments).toContain("compensation-planning")
    expect(compensationPlanning?.requiredPermission).toBe(
      "hrm.compensation_planning.search"
    )
    expect(compensationPlanning?.auditPrefix).toBe("erp.hrm.compensation")
    expect(HRM_MESSAGES.nav["compensation-planning"]).toBeTypeOf("string")
    expect(HRM_MESSAGES.compensationPlanning?.pageTitle).toBeTypeOf("string")
  })

  it("registers flexible-work capability and catalog keys", () => {
    const flexibleWork = getHrmCapabilityById("flexibleWork")
    expect(flexibleWork?.segments).toContain("flexible-work")
    expect(flexibleWork?.requiredPermission).toBe("hrm.flexible_work.search")
    expect(flexibleWork?.auditPrefix).toBe("erp.hrm.flexible_work")
    expect(HRM_MESSAGES.nav["flexible-work"]).toBeTypeOf("string")
    expect(HRM_MESSAGES.flexibleWork?.pageTitle).toBeTypeOf("string")
  })

  it("registers overtime capability and catalog keys", () => {
    const overtime = getHrmCapabilityById("overtime")
    expect(overtime?.segments).toContain("overtime")
    expect(overtime?.requiredPermission).toBe("hrm.overtime.search")
    expect(overtime?.auditPrefix).toBe("erp.hrm.overtime")
    expect(overtime?.nav.order).toBe(34)
    expect(HRM_MESSAGES.nav.overtime).toBeTypeOf("string")
    expect(HRM_MESSAGES.cards.overtime?.title).toBeTypeOf("string")
    expect(HRM_MESSAGES.overtime?.title).toBeTypeOf("string")
    expect(isAllowedHrmAppsSubsegment("overtime")).toBe(true)
  })

  it("registers geolocation capability and catalog keys", () => {
    const geolocation = getHrmCapabilityById("geolocation")
    expect(geolocation?.segments).toContain("geolocation")
    expect(geolocation?.requiredPermission).toBe("hrm.remote_checkin.search")
    expect(geolocation?.auditPrefix).toBe("erp.hrm.remote_checkin")
    expect(HRM_MESSAGES.nav["geolocation"]).toBeTypeOf("string")
  })

  it("registers absence-analytics capability and catalog keys", () => {
    const absenceAnalytics = getHrmCapabilityById("absenceAnalytics")
    expect(absenceAnalytics?.segments).toContain("absence-analytics")
    expect(absenceAnalytics?.requiredPermission).toBe(
      "hrm.absence_analytics.search"
    )
    expect(absenceAnalytics?.auditPrefix).toBe("erp.hrm.absence_analytics")
    expect(HRM_MESSAGES.nav["absence-analytics"]).toBeTypeOf("string")
    expect(HRM_MESSAGES.absenceAnalytics?.pageTitle).toBeTypeOf("string")
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
  it("organizationHrmRootPath matches organizationAppsPath(..., hrm)", () => {
    expect(organizationHrmRootPath(TEST_SLUG)).toBe(
      organizationAppsPath(TEST_SLUG, "hrm")
    )
  })

  it("organizationHrmPath builds /o/<slug>/apps/hrm/<segment>", () => {
    expect(organizationHrmPath(TEST_SLUG, "overview")).toBe(
      `/o/${TEST_SLUG}/apps/hrm`
    )
    for (const segment of getAllowedHrmAppsSubsegments()) {
      expect(organizationHrmPath(TEST_SLUG, segment)).toBe(
        `/o/${TEST_SLUG}/apps/hrm/${segment}`
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
      `/o/${TEST_SLUG}/apps/hrm/employees/${id}`
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
  it("includes hrm in APPS_NAV_MODULES", () => {
    expect(APPS_NAV_MODULES.includes("hrm")).toBe(true)
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
