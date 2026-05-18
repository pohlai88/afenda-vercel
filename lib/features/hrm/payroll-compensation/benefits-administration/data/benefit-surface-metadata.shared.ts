/**
 * Metadata vocabulary for governed-surface migration (no UI wiring in this phase).
 */

import {
  HRM_BENEFITS_TABS,
  type HrmBenefitsTab,
} from "./benefit-display.shared"

export const BENEFIT_LIST_SURFACE_IDS = {
  plans: "hrm-benefit-plans",
  enrollments: "hrm-benefit-enrollments",
  openEnrollment: "hrm-benefit-open-enrollment",
  providers: "hrm-benefit-providers",
  claimReferences: "hrm-benefit-claim-references",
  lifeEvents: "hrm-benefit-life-events",
} as const

export const BENEFIT_SURFACE_PERMISSION = {
  read: "hrm.benefit.search",
  mutate: "hrm.benefit.update",
} as const

export function benefitTabForSurfaceId(
  surfaceId: (typeof BENEFIT_LIST_SURFACE_IDS)[keyof typeof BENEFIT_LIST_SURFACE_IDS]
): HrmBenefitsTab {
  switch (surfaceId) {
    case BENEFIT_LIST_SURFACE_IDS.plans:
      return "plans"
    case BENEFIT_LIST_SURFACE_IDS.enrollments:
      return "enrollments"
    case BENEFIT_LIST_SURFACE_IDS.openEnrollment:
      return "openEnrollment"
    case BENEFIT_LIST_SURFACE_IDS.providers:
      return "providers"
    case BENEFIT_LIST_SURFACE_IDS.claimReferences:
      return "claimReferences"
    default:
      return HRM_BENEFITS_TABS[0]
  }
}
