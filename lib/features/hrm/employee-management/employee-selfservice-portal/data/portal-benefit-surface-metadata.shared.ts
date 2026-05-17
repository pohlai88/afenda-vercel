/**
 * Governed list-surface vocabulary for ESS benefits (metadata only).
 */

export const PORTAL_BENEFIT_LIST_SURFACE_IDS = {
  enrollments: "ess-benefit-enrollments",
  coverage: "ess-benefit-coverage",
  lifeEvents: "ess-benefit-life-events",
  dependents: "ess-benefit-dependents",
} as const

export type PortalBenefitListSurfaceId =
  (typeof PORTAL_BENEFIT_LIST_SURFACE_IDS)[keyof typeof PORTAL_BENEFIT_LIST_SURFACE_IDS]
