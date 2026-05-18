/**
 * HRM apps path segments under `/o/{slug}/apps/hrm/{segment}` (ADR-0029).
 */
export const HRM_APPS_CAPABILITY_SEGMENTS = [
  "advances",
  "attendance",
  "benefits",
  "bonus-incentives",
  "claims",
  "compliance",
  "documents",
  "employees",
  "flexible-work",
  "imports",
  "kpi",
  "leave",
  "lifecycle",
  "onboarding",
  "offboarding",
  "organization",
  "payroll",
  "performance",
  "policies",
  "recruitment",
  "salary-benchmarking",
  "skills",
  "signatures",
  "snapshot",
  "training",
] as const

export type HrmAppsCapabilitySegment =
  (typeof HRM_APPS_CAPABILITY_SEGMENTS)[number]

export const HRM_APPS_CAPABILITY_SEGMENT_SET = new Set<string>(
  HRM_APPS_CAPABILITY_SEGMENTS
)

export function isAllowedHrmAppsSubsegment(
  segment: string
): segment is HrmAppsCapabilitySegment {
  return HRM_APPS_CAPABILITY_SEGMENT_SET.has(segment)
}
