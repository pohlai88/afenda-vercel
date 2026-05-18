/**
 * HRM dashboard path segments under `/o/{slug}/dashboard/hrm/{segment}`.
 *
 * Single source for forwarded-path sanitization ({@link sanitizePathAfterOrgSlug}) and
 * registry parity tests against {@link HRM_CAPABILITIES} in `#features/hrm/constants`.
 */
export const HRM_DASHBOARD_CAPABILITY_SEGMENTS = [
  "advances",
  "attendance",
  "benefits",
  "claims",
  "compliance",
  "documents",
  "employees",
  "imports",
  "kpi",
  "leave",
  "onboarding",
  "offboarding",
  "organization",
  "payroll",
  "performance",
  "policies",
  "recruitment",
  "skills",
  "signatures",
  "snapshot",
  "training",
] as const

export type HrmDashboardCapabilitySegment =
  (typeof HRM_DASHBOARD_CAPABILITY_SEGMENTS)[number]

export const HRM_DASHBOARD_CAPABILITY_SEGMENT_SET = new Set<string>(
  HRM_DASHBOARD_CAPABILITY_SEGMENTS
)
