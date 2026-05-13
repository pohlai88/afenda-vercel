export const ORBIT_DASHBOARD_SURFACES = [
  "queue",
  "triage",
  "today",
  "timeline",
  "signals",
  "sessions",
  "links",
] as const

export type OrbitDashboardSurface = (typeof ORBIT_DASHBOARD_SURFACES)[number]

export const ORBIT_DASHBOARD_SURFACE_SEGMENTS = [
  "triage",
  "today",
  "timeline",
  "signals",
  "sessions",
  "links",
] as const

export type OrbitDashboardSurfaceSegment =
  (typeof ORBIT_DASHBOARD_SURFACE_SEGMENTS)[number]

export const ORBIT_DASHBOARD_SURFACE_SEGMENT_SET = new Set<string>(
  ORBIT_DASHBOARD_SURFACE_SEGMENTS
)

export function isOrbitDashboardSurfaceSegment(
  value: string
): value is OrbitDashboardSurfaceSegment {
  return ORBIT_DASHBOARD_SURFACE_SEGMENT_SET.has(value)
}
