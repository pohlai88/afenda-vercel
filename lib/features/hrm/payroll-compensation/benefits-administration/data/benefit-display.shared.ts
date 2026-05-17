/**
 * URL-driven tab vocabulary for the Benefits administration surface.
 * Kept client-safe (no `server-only`) so tab navigation can live in a
 * small client island without importing query modules.
 */

export const HRM_BENEFITS_TABS = [
  "plans",
  "providers",
  "enrollments",
  "claimReferences",
  "openEnrollment",
  "life",
  "reports",
] as const

export type HrmBenefitsTab = (typeof HRM_BENEFITS_TABS)[number]

export const HRM_BENEFITS_DEFAULT_TAB: HrmBenefitsTab = "plans"

export function isHrmBenefitsTab(value: string): value is HrmBenefitsTab {
  return (HRM_BENEFITS_TABS as readonly string[]).includes(value)
}
