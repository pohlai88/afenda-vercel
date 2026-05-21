/**
 * Forward-path segment allowlists for org ERP URLs (ADR-0029).
 * Owned by `lib/i18n/` so path sanitization stays acyclic (no feature module imports).
 * HRM and Orbit modules re-export these constants for registry SSOT tests.
 */

export const HRM_APPS_CAPABILITY_SEGMENTS = [
  "advances",
  "absence-analytics",
  "attendance",
  "benefits",
  "bonus-incentives",
  "claims",
  "compensation-planning",
  "compliance",
  "documents",
  "employees",
  "flexible-work",
  "geolocation",
  "time-clock",
  "shift-scheduling",
  "overtime",
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

export const ORBIT_SURFACE_SEGMENTS = [
  "triage",
  "today",
  "timeline",
  "signals",
  "sessions",
  "links",
] as const

export type OrbitSurfaceSegment = (typeof ORBIT_SURFACE_SEGMENTS)[number]

export const ORBIT_SURFACE_SEGMENT_SET = new Set<string>(ORBIT_SURFACE_SEGMENTS)

export function isOrbitSurfaceSegment(
  value: string
): value is OrbitSurfaceSegment {
  return ORBIT_SURFACE_SEGMENT_SET.has(value)
}
