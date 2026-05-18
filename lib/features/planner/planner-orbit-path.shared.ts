export const ORBIT_SURFACES = [
  "queue",
  "triage",
  "today",
  "timeline",
  "signals",
  "sessions",
  "links",
] as const

export type OrbitSurface = (typeof ORBIT_SURFACES)[number]

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
