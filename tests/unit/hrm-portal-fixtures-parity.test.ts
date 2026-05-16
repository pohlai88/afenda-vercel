import { describe, expect, it } from "vitest"

import en from "../../messages/en.json"
import {
  HRM_PORTAL_NAV_COPY,
  HRM_PORTAL_PAGE_HEADINGS,
} from "../fixtures/hrm-portal"

describe("hrm portal fixtures ↔ messages/en.json", () => {
  it("portal nav labels match catalog", () => {
    expect(HRM_PORTAL_NAV_COPY.leave).toBe(en.Dashboard.Hrm.portalNav.leave)
    expect(HRM_PORTAL_NAV_COPY.profile).toBe(en.Dashboard.Hrm.portalNav.profile)
    expect(HRM_PORTAL_NAV_COPY.offboarding).toBe(
      en.Dashboard.Hrm.portalNav.offboarding
    )
  })

  it("portal page headings match catalog", () => {
    expect(HRM_PORTAL_PAGE_HEADINGS.profile).toBe(
      en.Dashboard.Hrm.portalProfile.pageTitle
    )
    expect(HRM_PORTAL_PAGE_HEADINGS.performance).toBe(
      en.Dashboard.Hrm.portalPerformance.pageTitle
    )
  })
})
